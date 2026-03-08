# ⬡ THE WALL — Web3 Crypto Portfolio
**Kannur → Dubai · DWIN · 2026**

Multi-chain Web3 portfolio tracker with gasless smart wallet login.

---

## Stack
- **Next.js 14** + TypeScript
- **Alchemy Account Kit** — Smart wallet, no seed phrase
- **Gasless transactions** via `Emobies-Sponsorship-v1` policy (54+ networks)
- **Multi-chain**: ETH · SOL · BNB · Polygon · Bitcoin
- **Deployed on Vercel**

---

## Setup

### 1. Clone & install
```bash
git clone https://github.com/Emobies05/Thewall
cd Thewall
npm install
```

### 2. Configure environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:
- `NEXT_PUBLIC_ALCHEMY_API_KEY` — from https://dashboard.alchemy.com → TheWall Eth app
- `ALCHEMY_SOL_API_KEY` — from TheWall Sol app
- `NEXT_PUBLIC_ALCHEMY_ACCOUNT_KIT_API_KEY` — for smart wallet login
- `NEXT_PUBLIC_GAS_POLICY_ID` — `Emobies-Sponsorship-v1` policy ID

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:3000

### 4. Deploy to Vercel
```bash
vercel --prod
```
Add all `.env.local` values to Vercel environment variables.

---

## Wallets
| Wallet | Address |
|---|---|
| Main (ETH) | `0xba24d47e...f3f4e1` |
| Treasury | `0xecbdebb62d636808a3e94183070585814127393d` |
| Solana | `5auZoWJxJodSU8dwgKmAfmphv5Z9Su3HAzEdLz1EUZs7` |

---

## Architecture
```
Frontend (Next.js/Vercel)
       ↓
/api/prices     → CoinGecko (live token prices, 60s cache)
/api/balance    → Alchemy ETH RPC (wallet balances)
/api/solana     → Alchemy SOL RPC (SOL balance)
       ↓
Webhooks → Alchemy (Solana address activity)
       ↓
Smart Wallet → Alchemy Account Kit (gasless, no seed phrase)
```

---

## Revenue Goal
**$6,200,000 (₹52 Crore)**

---

⬡ THE WALL · EMOBIES · EMOWALL AI 2.0
