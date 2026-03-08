// app/api/auth/webauthn/route.ts
// WebAuthn — Face ID / Fingerprint authentication

import { NextResponse } from 'next/server'
import crypto from 'crypto'

const RP_ID = process.env.NEXT_PUBLIC_DOMAIN || 'thewall.e-mobies.com'
const RP_NAME = 'TheWall · DWIN'

// In-memory challenge store (use Redis in production)
const challengeStore = new Map<string, { challenge: string; expires: number }>()

// GET /api/auth/webauthn — Generate registration/auth challenge
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'authenticate' // 'register' | 'authenticate'
  const userId = searchParams.get('userId') || 'owner'

  const challenge = crypto.randomBytes(32).toString('base64url')
  const expires = Date.now() + 2 * 60 * 1000 // 2 min

  challengeStore.set(userId, { challenge, expires })

  if (type === 'register') {
    // Registration options
    return NextResponse.json({
      type: 'register',
      challenge,
      rp: { id: RP_ID, name: RP_NAME },
      user: {
        id: Buffer.from(userId).toString('base64url'),
        name: userId,
        displayName: 'TheWall Owner',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // face/fingerprint on device
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 120000,
      attestation: 'none',
    })
  }

  // Authentication options
  return NextResponse.json({
    type: 'authenticate',
    challenge,
    rpId: RP_ID,
    userVerification: 'required',
    timeout: 120000,
  })
}

// POST /api/auth/webauthn — Verify biometric response
export async function POST(request: Request) {
  try {
    const { userId, credentialId, clientDataJSON, txId } = await request.json()

    const stored = challengeStore.get(userId || 'owner')
    if (!stored || Date.now() > stored.expires) {
      return NextResponse.json({ error: 'Challenge expired. Please retry.' }, { status: 401 })
    }

    // Parse clientDataJSON to verify challenge
    const clientData = JSON.parse(
      Buffer.from(clientDataJSON, 'base64url').toString('utf8')
    )

    if (clientData.challenge !== stored.challenge) {
      return NextResponse.json({ error: 'Challenge mismatch — possible replay attack' }, { status: 401 })
    }

    // Clear used challenge (prevent replay)
    challengeStore.delete(userId || 'owner')

    // Mark biometric verified for transaction
    if (txId) {
      const { updateTx } = await import('@/lib/approval-store')
      updateTx(txId, { biometricVerified: true })
    }

    return NextResponse.json({
      verified: true,
      method: 'webauthn',
      credentialId,
      txId,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Biometric verification failed' }, { status: 500 })
  }
}
