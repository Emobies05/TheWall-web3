// app/api/auth/totp/route.ts
// Google Authenticator TOTP — setup & verify

import { NextResponse } from 'next/server'
import { authenticator } from 'otplib'

// Secret stored in env (generate once, store securely)
const TOTP_SECRET = process.env.TOTP_SECRET || authenticator.generateSecret()

// Strict settings: 30s window, 1 step tolerance
authenticator.options = {
  step: 30,
  window: 1,
  digits: 6,
  algorithm: 'sha1',
}

// GET /api/auth/totp — Generate QR code setup URI
export async function GET() {
  try {
    const accountName = process.env.OWNER_EMAIL || 'dwin@thewall'
    const issuer = 'TheWall · DWIN'

    const otpAuthUrl = authenticator.keyuri(accountName, issuer, TOTP_SECRET)

    return NextResponse.json({
      secret: TOTP_SECRET,
      otpAuthUrl,
      // QR code URL (use this in frontend with a QR library)
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`,
      instructions: 'Scan this QR code with Google Authenticator app',
    })
  } catch (error) {
    return NextResponse.json({ error: 'TOTP setup failed' }, { status: 500 })
  }
}

// POST /api/auth/totp — Verify a 6-digit token
export async function POST(request: Request) {
  try {
    const { token, txId } = await request.json()

    if (!token || token.length !== 6) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    const isValid = authenticator.verify({
      token: String(token),
      secret: TOTP_SECRET,
    })

    if (!isValid) {
      return NextResponse.json({
        verified: false,
        error: 'Invalid or expired code. Codes refresh every 30 seconds.',
      }, { status: 401 })
    }

    // If txId provided, mark TOTP as verified for that transaction
    if (txId) {
      const { updateTx } = await import('@/lib/approval-store')
      updateTx(txId, { totpVerified: true })
    }

    return NextResponse.json({ verified: true, txId })
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
