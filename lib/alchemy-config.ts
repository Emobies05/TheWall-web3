// lib/alchemy-config.ts
// TheWall - Alchemy Multi-Chain Configuration

export const ALCHEMY_CONFIG = {
  eth: {
    apiKey: process.env.ALCHEMY_ETH_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '',
    rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_ETH_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    network: 'eth-mainnet',
  },
  sol: {
    apiKey: process.env.ALCHEMY_SOL_API_KEY || '',
    rpcUrl: `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_SOL_API_KEY}`,
    network: 'solana-mainnet',
  },
  polygon: {
    apiKey: process.env.ALCHEMY_POLYGON_API_KEY || '',
    rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_POLYGON_API_KEY}`,
    network: 'polygon-mainnet',
  },
}

export const WALLETS = {
  main: process.env.NEXT_PUBLIC_MAIN_WALLET || '0xba24d47ef3f4e1000000000000000000f3f4e1',
  treasury: process.env.NEXT_PUBLIC_TREASURY_WALLET || '0xecbdebb62d636808a3e94183070585814127393d',
  sol: process.env.NEXT_PUBLIC_SOL_WALLET || '5auZoWJxJodSU8dwgKmAfmphv5Z9Su3HAzEdLz1EUZs7',
}

export const GOAL_USD = Number(process.env.NEXT_PUBLIC_GOAL_USD) || 6200000

// USDC contract on Ethereum (tracked via GraphQL)
export const USDC_CONTRACT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

// Emocoin config
export const EMOCOIN = {
  symbol: 'EMC',
  balance: 250,
  priceUsd: 0.01,
}
