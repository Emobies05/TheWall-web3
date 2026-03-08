// app/api/balance/route.ts
// Fetches wallet balances from Alchemy for ETH + tokens

import { NextResponse } from 'next/server'
import { ALCHEMY_CONFIG, WALLETS } from '@/lib/alchemy-config'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address') || WALLETS.main
  const apiKey = ALCHEMY_CONFIG.eth.apiKey

  if (!apiKey || apiKey === '') {
    return NextResponse.json({ error: 'Alchemy API key not configured' }, { status: 503 })
  }

  try {
    // Fetch ETH balance
    const ethRes = await fetch(
      `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest'],
        }),
      }
    )
    const ethData = await ethRes.json()
    const ethBalanceWei = BigInt(ethData.result || '0x0')
    const ethBalance = Number(ethBalanceWei) / 1e18

    // Fetch token balances (USDC, USDT, etc.)
    const tokenRes = await fetch(
      `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'alchemy_getTokenBalances',
          params: [address],
        }),
      }
    )
    const tokenData = await tokenRes.json()

    return NextResponse.json({
      address,
      ethBalance,
      tokenBalances: tokenData.result?.tokenBalances || [],
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Balance fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 })
  }
}
