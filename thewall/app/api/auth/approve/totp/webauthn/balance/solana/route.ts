// app/api/auth/approve/route.ts
// Transaction approval — owner + user dual confirmation

import { NextResponse } from 'next/server'
import { createPendingTx, getTx, updateTx, rejectTx, getAllPending } from '@/lib/approval-store'

const OWNER_WALLET = process.env.NEXT_PUBLIC_MAIN_WALLET || '0xba24d47e'

// GET /api/auth/approve — List all pending transactions (owner only)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const txId = searchParams.get('txId')

  if (txId) {
    const tx = getTx(txId)
    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    return NextResponse.json(tx)
  }

  return NextResponse.json({ pending: getAllPending() })
}

// POST /api/auth/approve — Create or approve a transaction
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, txId, role, ...txData } = body

    // ── CREATE new pending transaction ──
    if (action === 'create') {
      const tx = createPendingTx({
        to: txData.to,
        value: txData.value,
        token: txData.token || 'ETH',
        chain: txData.chain || 'Ethereum',
        initiatedBy: txData.initiatedBy,
      })

      // In production: send push notification to owner here
      // await sendPushNotification(OWNER_WALLET, tx)

      return NextResponse.json({
        txId: tx.id,
        status: tx.status,
        message: 'Transaction pending approval. Both owner and user must confirm.',
        expiresAt: tx.expiresAt,
      })
    }

    // ── APPROVE transaction ──
    if (action === 'approve') {
      const tx = getTx(txId)
      if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
      if (tx.status === 'expired') return NextResponse.json({ error: 'Transaction expired' }, { status: 410 })
      if (tx.status === 'rejected') return NextResponse.json({ error: 'Transaction already rejected' }, { status: 409 })

      const updates: Record<string, boolean> = {}
      if (role === 'owner') updates.ownerApproved = true
      if (role === 'user') updates.userApproved = true

      const updated = updateTx(txId, updates)
      return NextResponse.json({
        txId,
        status: updated?.status,
        ownerApproved: updated?.ownerApproved,
        userApproved: updated?.userApproved,
        totpVerified: updated?.totpVerified,
        biometricVerified: updated?.biometricVerified,
        readyToSign: updated?.status === 'both_approved' &&
                     updated?.totpVerified &&
                     updated?.biometricVerified,
      })
    }

    // ── REJECT transaction ──
    if (action === 'reject') {
      rejectTx(txId)
      return NextResponse.json({ txId, status: 'rejected' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 })
  }
}
