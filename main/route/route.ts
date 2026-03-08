// app/api/solana/route.ts
// Fetches Solana wallet balance via Alchemy

import { NextResponse } from 'next/server'
import { ALCHEMY_CONFIG, WALLETS } from '@/lib/alchemy-config'

export async function GET() {
  const apiKey = ALCHEMY_CONFIG.sol.apiKey

  if (!apiKey || apiKey === '') {
    return NextResponse.json({ error: 'Alchemy Solana API key not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(
      `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [WALLETS.sol],
        }),
      }
    )

    const data = await res.json()
    const lamports = data.result?.value || 0
    const solBalance = lamports / 1e9

    return NextResponse.json({
      address: WALLETS.sol,
      solBalance,
      lamports,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Solana balance error:', error)
    return NextResponse.json({ error: 'Failed to fetch Solana balance' }, { status: 500 })
  }
}
