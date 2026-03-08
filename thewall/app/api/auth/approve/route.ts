// app/api/prices/route.ts
// Fetches live token prices from Alchemy / CoinGecko fallback

import { NextResponse } from 'next/server'

const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BNB: 'binancecoin',
  USDC: 'usd-coin',
  USDT: 'tether',
  SOL: 'solana',
  BTC: 'bitcoin',
  MATIC: 'matic-network',
}

export async function GET() {
  try {
    const ids = Object.values(COINGECKO_IDS).join(',')
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 60 } } // cache 60 seconds
    )

    if (!response.ok) throw new Error('CoinGecko fetch failed')
    const data = await response.json()

    const prices: Record<string, { price: number; change24h: number }> = {}
    for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
      prices[symbol] = {
        price: data[id]?.usd ?? 0,
        change24h: data[id]?.usd_24h_change ?? 0,
      }
    }

    return NextResponse.json({ prices, updatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Price fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prices', prices: {} },
      { status: 500 }
    )
  }
}
