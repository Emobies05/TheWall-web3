// lib/approval-store.ts
// In-memory store for pending transaction approvals
// In production: replace with Redis or database

export type ApprovalStatus = 'pending' | 'owner_approved' | 'user_approved' | 'both_approved' | 'rejected' | 'expired'

export interface PendingTransaction {
  id: string
  to: string
  value: string
  token: string
  chain: string
  initiatedBy: string // user wallet
  initiatedAt: number
  expiresAt: number   // 5 minute window
  status: ApprovalStatus
  ownerApproved: boolean
  userApproved: boolean
  totpVerified: boolean
  biometricVerified: boolean
  ownerChallenge?: string // WebAuthn challenge
  userChallenge?: string
}

// In-memory store (use Redis in production)
const store = new Map<string, PendingTransaction>()

export function createPendingTx(data: Omit<PendingTransaction, 'id' | 'initiatedAt' | 'expiresAt' | 'status' | 'ownerApproved' | 'userApproved' | 'totpVerified' | 'biometricVerified'>): PendingTransaction {
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const tx: PendingTransaction = {
    ...data,
    id,
    initiatedAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    status: 'pending',
    ownerApproved: false,
    userApproved: false,
    totpVerified: false,
    biometricVerified: false,
  }
  store.set(id, tx)
  return tx
}

export function getTx(id: string): PendingTransaction | undefined {
  const tx = store.get(id)
  if (!tx) return undefined
  if (Date.now() > tx.expiresAt) {
    tx.status = 'expired'
    store.set(id, tx)
  }
  return tx
}

export function updateTx(id: string, updates: Partial<PendingTransaction>): PendingTransaction | undefined {
  const tx = store.get(id)
  if (!tx) return undefined
  const updated = { ...tx, ...updates }

  // Auto-update status
  if (updated.ownerApproved && updated.userApproved &&
      updated.totpVerified && updated.biometricVerified) {
    updated.status = 'both_approved'
  } else if (updated.ownerApproved && !updated.userApproved) {
    updated.status = 'owner_approved'
  } else if (updated.userApproved && !updated.ownerApproved) {
    updated.status = 'user_approved'
  }

  store.set(id, updated)
  return updated
}

export function rejectTx(id: string): void {
  const tx = store.get(id)
  if (tx) store.set(id, { ...tx, status: 'rejected' })
}

export function getAllPending(): PendingTransaction[] {
  return Array.from(store.values()).filter(tx =>
    tx.status === 'pending' || tx.status === 'owner_approved' || tx.status === 'user_approved'
  )
}
