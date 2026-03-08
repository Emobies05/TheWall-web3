'use client'
// components/TransactionApproval.tsx
// Full 3-layer security: App Approval + TOTP + Biometric

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface TxRequest {
  txId: string
  to: string
  value: string
  token: string
  chain: string
  initiatedBy: string
  expiresAt: number
  status: string
  ownerApproved: boolean
  userApproved: boolean
  totpVerified: boolean
  biometricVerified: boolean
}

interface Props {
  txId?: string
  role: 'owner' | 'user'
  onApproved?: (txId: string) => void
  onRejected?: (txId: string) => void
}

type Step = 'loading' | 'app_approval' | 'totp' | 'biometric' | 'complete' | 'rejected' | 'expired'

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TransactionApproval({ txId, role, onApproved, onRejected }: Props) {
  const [step, setStep] = useState<Step>('loading')
  const [tx, setTx] = useState<TxRequest | null>(null)
  const [totp, setTotp] = useState('')
  const [totpError, setTotpError] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  const [bioError, setBioError] = useState('')
  const [timeLeft, setTimeLeft] = useState(300)
  const [qrUrl, setQrUrl] = useState('')
  const [setupMode, setSetupMode] = useState(false)

  // ── Load transaction ──
  const loadTx = useCallback(async () => {
    if (!txId) return
    try {
      const res = await fetch(`/api/auth/approve?txId=${txId}`)
      const data = await res.json()
      setTx(data)

      if (data.status === 'expired') { setStep('expired'); return }
      if (data.status === 'rejected') { setStep('rejected'); return }
      if (data.status === 'both_approved' && data.totpVerified && data.biometricVerified) {
        setStep('complete'); return
      }

      // Determine current step
      const myApproved = role === 'owner' ? data.ownerApproved : data.userApproved
      if (!myApproved) { setStep('app_approval'); return }
      if (!data.totpVerified && role === 'owner') { setStep('totp'); return }
      if (!data.biometricVerified) { setStep('biometric'); return }
      setStep('complete')
    } catch {
      setStep('loading')
    }
  }, [txId, role])

  useEffect(() => { loadTx() }, [loadTx])

  // ── Countdown timer ──
  useEffect(() => {
    if (!tx) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((tx.expiresAt - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) setStep('expired')
    }, 1000)
    return () => clearInterval(interval)
  }, [tx])

  // ── Step 1: App Approval ──
  const handleAppApproval = async (approve: boolean) => {
    if (!txId) return
    if (!approve) {
      await fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', txId }),
      })
      setStep('rejected')
      onRejected?.(txId)
      return
    }

    const res = await fetch('/api/auth/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', txId, role }),
    })
    const data = await res.json()
    setTx(prev => prev ? { ...prev, ...data } : null)

    // Owner goes to TOTP next, user goes to biometric
    if (role === 'owner') setStep('totp')
    else setStep('biometric')
  }

  // ── Step 2: TOTP Verify ──
  const handleTOTP = async () => {
    if (totp.length !== 6) return
    setTotpLoading(true)
    setTotpError('')
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totp, txId }),
      })
      const data = await res.json()
      if (data.verified) {
        setStep('biometric')
      } else {
        setTotpError(data.error || 'Invalid code')
        setTotp('')
      }
    } catch {
      setTotpError('Verification failed. Try again.')
    }
    setTotpLoading(false)
  }

  // ── Load TOTP QR ──
  const loadQR = async () => {
    const res = await fetch('/api/auth/totp')
    const data = await res.json()
    setQrUrl(data.qrUrl)
    setSetupMode(true)
  }

  // ── Step 3: WebAuthn Biometric ──
  const handleBiometric = async () => {
    setBioLoading(true)
    setBioError('')
    try {
      // Get challenge
      const challengeRes = await fetch(`/api/auth/webauthn?type=authenticate&userId=${role}`)
      const options = await challengeRes.json()

      // Request biometric via WebAuthn API
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 120000,
        }
      }) as PublicKeyCredential | null

      if (!credential) throw new Error('No credential returned')

      const response = credential.response as AuthenticatorAssertionResponse
      const clientDataJSON = btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON)))

      // Verify with server
      const verifyRes = await fetch('/api/auth/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: role,
          credentialId: credential.id,
          clientDataJSON,
          txId,
        }),
      })

      const verifyData = await verifyRes.json()
      if (verifyData.verified) {
        setStep('complete')
        await loadTx()
        onApproved?.(txId || '')
      } else {
        setBioError('Biometric verification failed')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setBioError('Biometric cancelled or not available on this device')
      } else {
        setBioError('Biometric failed. Make sure Face ID / Fingerprint is set up.')
      }
    }
    setBioLoading(false)
  }

  // ── Register biometric (first time) ──
  const handleBioRegister = async () => {
    setBioLoading(true)
    try {
      const challengeRes = await fetch(`/api/auth/webauthn?type=register&userId=${role}`)
      const options = await challengeRes.json()

      await navigator.credentials.create({
        publicKey: {
          challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
          rp: options.rp,
          user: {
            id: Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0)),
            name: options.user.name,
            displayName: options.user.displayName,
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout,
        }
      })
      setBioError('')
      alert('✅ Biometric registered! You can now use Face ID / Fingerprint.')
    } catch {
      setBioError('Registration failed. Check device biometric settings.')
    }
    setBioLoading(false)
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const fmtAddr = (a: string) => `${a.slice(0, 8)}...${a.slice(-6)}`

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.wrap}>
      <div style={S.card}>

        {/* Header */}
        <div style={S.header}>
          <span style={S.hexIcon}>⬡</span>
          <div>
            <div style={S.title}>TRANSACTION APPROVAL</div>
            <div style={S.subtitle}>TheWall · Maximum Security</div>
          </div>
          {tx && step !== 'complete' && step !== 'rejected' && step !== 'expired' && (
            <div style={{ ...S.timer, color: timeLeft < 60 ? '#ff4466' : '#00b3f7' }}>
              ⏱ {fmtTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div style={S.progress}>
          {[
            { key: 'app_approval', icon: '📱', label: 'Approve' },
            { key: 'totp', icon: '🔐', label: 'Auth Code' },
            { key: 'biometric', icon: '👆', label: 'Biometric' },
            { key: 'complete', icon: '✅', label: 'Done' },
          ].map((s, i) => {
            const steps = ['app_approval', 'totp', 'biometric', 'complete']
            const currentIdx = steps.indexOf(step)
            const thisIdx = steps.indexOf(s.key)
            const isDone = currentIdx > thisIdx
            const isCurrent = step === s.key
            return (
              <div key={s.key} style={S.progressStep}>
                <div style={{
                  ...S.progressDot,
                  background: isDone ? '#00ff88' : isCurrent ? '#00b3f7' : 'rgba(255,255,255,0.08)',
                  border: isCurrent ? '2px solid #00b3f7' : '2px solid transparent',
                  boxShadow: isCurrent ? '0 0 12px rgba(0,179,247,0.5)' : 'none',
                }}>
                  {isDone ? '✓' : s.icon}
                </div>
                <div style={{
                  ...S.progressLabel,
                  color: isCurrent ? '#00b3f7' : isDone ? '#00ff88' : 'rgba(255,255,255,0.25)',
                }}>{s.label}</div>
                {i < 3 && <div style={{
                  ...S.progressLine,
                  background: isDone ? '#00ff88' : 'rgba(255,255,255,0.06)',
                }} />}
              </div>
            )
          })}
        </div>

        {/* Transaction Details */}
        {tx && (
          <div style={S.txBox}>
            <div style={S.txRow}>
              <span style={S.txLabel}>TO</span>
              <span style={S.txVal}>{fmtAddr(tx.to)}</span>
            </div>
            <div style={S.txRow}>
              <span style={S.txLabel}>AMOUNT</span>
              <span style={{ ...S.txVal, color: '#ffd700', fontSize: '1.1rem', fontWeight: 700 }}>
                {tx.value} {tx.token}
              </span>
            </div>
            <div style={S.txRow}>
              <span style={S.txLabel}>CHAIN</span>
              <span style={S.txVal}>{tx.chain}</span>
            </div>
            <div style={S.txRow}>
              <span style={S.txLabel}>ROLE</span>
              <span style={{ ...S.txVal, color: role === 'owner' ? '#fc90c5' : '#00b3f7', textTransform: 'uppercase' }}>
                {role}
              </span>
            </div>
          </div>
        )}

        {/* ── STEP: App Approval ── */}
        {step === 'app_approval' && (
          <div style={S.stepContent}>
            <div style={S.stepIcon}>📱</div>
            <div style={S.stepTitle}>Confirm Transaction</div>
            <div style={S.stepDesc}>
              {role === 'owner'
                ? 'As the owner, you must approve this transaction first.'
                : 'The owner has approved. Now confirm as the user.'}
            </div>
            <div style={S.btnRow}>
              <button style={S.btnReject} onClick={() => handleAppApproval(false)}>
                ✕ Reject
              </button>
              <button style={S.btnApprove} onClick={() => handleAppApproval(true)}>
                ✓ Approve
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: TOTP ── */}
        {step === 'totp' && (
          <div style={S.stepContent}>
            <div style={S.stepIcon}>🔐</div>
            <div style={S.stepTitle}>Google Authenticator</div>
            <div style={S.stepDesc}>
              Enter the 6-digit code from your Authenticator app.
            </div>

            {setupMode && qrUrl ? (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img src={qrUrl} alt="QR Code" style={{ borderRadius: 8, border: '2px solid rgba(0,179,247,0.3)' }} />
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                  Scan with Google Authenticator
                </div>
                <button style={S.btnGhost} onClick={() => setSetupMode(false)}>
                  Already scanned →
                </button>
              </div>
            ) : (
              <>
                <input
                  style={S.codeInput}
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={totp}
                  maxLength={6}
                  onChange={e => {
                    setTotpError('')
                    setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleTOTP()}
                  autoFocus
                />
                {totpError && <div style={S.errorMsg}>⚠ {totpError}</div>}
                <button
                  style={{ ...S.btnPrimary, opacity: totpLoading || totp.length !== 6 ? 0.5 : 1 }}
                  onClick={handleTOTP}
                  disabled={totpLoading || totp.length !== 6}
                >
                  {totpLoading ? '⏳ Verifying...' : '→ Verify Code'}
                </button>
                <button style={S.btnGhost} onClick={loadQR}>
                  First time? Setup Authenticator →
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP: Biometric ── */}
        {step === 'biometric' && (
          <div style={S.stepContent}>
            <div style={{ ...S.stepIcon, animation: bioLoading ? 'pulse 1s ease-in-out infinite' : 'none' }}>
              {bioLoading ? '⏳' : '👆'}
            </div>
            <div style={S.stepTitle}>
              {bioLoading ? 'Scanning...' : 'Face ID / Fingerprint'}
            </div>
            <div style={S.stepDesc}>
              {bioLoading
                ? 'Place your finger or look at your device'
                : 'Authenticate with your device biometrics to complete approval.'}
            </div>
            {bioError && <div style={S.errorMsg}>⚠ {bioError}</div>}
            <button
              style={{ ...S.btnPrimary, opacity: bioLoading ? 0.6 : 1 }}
              onClick={handleBiometric}
              disabled={bioLoading}
            >
              {bioLoading ? '⏳ Waiting...' : '👆 Authenticate'}
            </button>
            <button style={S.btnGhost} onClick={handleBioRegister} disabled={bioLoading}>
              First time? Register biometric →
            </button>
          </div>
        )}

        {/* ── STEP: Complete ── */}
        {step === 'complete' && (
          <div style={{ ...S.stepContent, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12, filter: 'drop-shadow(0 0 20px #00ff88)' }}>✅</div>
            <div style={{ ...S.stepTitle, color: '#00ff88' }}>Transaction Approved!</div>
            <div style={S.stepDesc}>
              All 3 security layers passed. Transaction is ready to broadcast.
            </div>
            <div style={S.checkList}>
              {[
                ['📱', 'App approval', true],
                ['🔐', 'Google Authenticator', true],
                ['👆', 'Biometric verified', true],
              ].map(([icon, label, done]) => (
                <div key={label as string} style={S.checkRow}>
                  <span>{icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{label as string}</span>
                  <span style={{ color: '#00ff88', marginLeft: 'auto' }}>✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: Rejected ── */}
        {step === 'rejected' && (
          <div style={{ ...S.stepContent, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚫</div>
            <div style={{ ...S.stepTitle, color: '#ff4466' }}>Transaction Rejected</div>
            <div style={S.stepDesc}>This transaction has been cancelled.</div>
          </div>
        )}

        {/* ── STEP: Expired ── */}
        {step === 'expired' && (
          <div style={{ ...S.stepContent, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⏰</div>
            <div style={{ ...S.stepTitle, color: '#ffd700' }}>Transaction Expired</div>
            <div style={S.stepDesc}>The 5-minute approval window has passed. Please initiate a new transaction.</div>
          </div>
        )}

        {/* ── STEP: Loading ── */}
        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={S.spinner} />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: 12 }}>
              Loading transaction...
            </div>
          </div>
        )}

        {/* Security badge */}
        <div style={S.secBadge}>
          🔒 3-Layer Security · TheWall · Alchemy Account Kit
        </div>
      </div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: '#030508',
    backgroundImage: 'linear-gradient(rgba(0,179,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,179,247,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    fontFamily: "'Space Mono', monospace",
  },
  card: {
    width: '100%',
    maxWidth: 460,
    background: 'rgba(7,13,20,0.98)',
    border: '1px solid rgba(0,179,247,0.25)',
    borderRadius: 16,
    padding: '32px 28px',
    boxShadow: '0 0 80px rgba(0,179,247,0.08), inset 0 1px 0 rgba(0,179,247,0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: '1px solid rgba(0,179,247,0.1)',
  },
  hexIcon: {
    fontSize: '2rem',
    color: '#00b3f7',
    filter: 'drop-shadow(0 0 10px rgba(0,179,247,0.5))',
  },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '1rem',
    fontWeight: 800,
    letterSpacing: '0.15em',
    color: '#e8f4fd',
  },
  subtitle: {
    fontSize: '0.6rem',
    color: 'rgba(232,244,253,0.35)',
    letterSpacing: '0.1em',
    marginTop: 2,
  },
  timer: {
    marginLeft: 'auto',
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    padding: '4px 10px',
    background: 'rgba(0,179,247,0.06)',
    borderRadius: 6,
    border: '1px solid rgba(0,179,247,0.15)',
  },
  progress: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  progressDot: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    marginBottom: 6,
    transition: 'all 0.3s',
    position: 'relative',
    zIndex: 1,
  },
  progressLine: {
    position: 'absolute',
    top: 20,
    left: '50%',
    width: '100%',
    height: 2,
    transition: 'background 0.3s',
    zIndex: 0,
  },
  progressLabel: {
    fontSize: '0.55rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    transition: 'color 0.3s',
  },
  txBox: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(0,179,247,0.12)',
    borderRadius: 10,
    padding: '16px 20px',
    marginBottom: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  txRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLabel: {
    fontSize: '0.6rem',
    color: 'rgba(232,244,253,0.3)',
    letterSpacing: '0.12em',
  },
  txVal: {
    fontSize: '0.82rem',
    color: '#e8f4fd',
    fontWeight: 700,
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  stepIcon: {
    fontSize: '2.5rem',
    marginBottom: 4,
  },
  stepTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#e8f4fd',
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: '0.75rem',
    color: 'rgba(232,244,253,0.5)',
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 8,
    maxWidth: 320,
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  btnApprove: {
    flex: 1,
    padding: '13px',
    background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,255,136,0.05))',
    border: '1px solid rgba(0,255,136,0.3)',
    borderRadius: 8,
    color: '#00ff88',
    fontFamily: "'Space Mono', monospace",
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnReject: {
    flex: 1,
    padding: '13px',
    background: 'rgba(255,68,102,0.08)',
    border: '1px solid rgba(255,68,102,0.25)',
    borderRadius: 8,
    color: '#ff4466',
    fontFamily: "'Space Mono', monospace",
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnPrimary: {
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, rgba(0,179,247,0.2), rgba(0,179,247,0.08))',
    border: '1px solid rgba(0,179,247,0.35)',
    borderRadius: 8,
    color: '#00b3f7',
    fontFamily: "'Space Mono', monospace",
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnGhost: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(232,244,253,0.3)',
    fontFamily: "'Space Mono', monospace",
    fontSize: '0.7rem',
    cursor: 'pointer',
    padding: '8px 0',
  },
  codeInput: {
    width: '100%',
    padding: '16px',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(0,179,247,0.3)',
    borderRadius: 8,
    color: '#e8f4fd',
    fontFamily: "'Space Mono', monospace",
    fontSize: '1.4rem',
    textAlign: 'center',
    letterSpacing: '0.4em',
    outline: 'none',
  },
  errorMsg: {
    fontSize: '0.72rem',
    color: '#ff8899',
    background: 'rgba(255,68,102,0.08)',
    border: '1px solid rgba(255,68,102,0.2)',
    borderRadius: 6,
    padding: '8px 14px',
    width: '100%',
    textAlign: 'center',
  },
  checkList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
    padding: '16px',
    background: 'rgba(0,255,136,0.04)',
    border: '1px solid rgba(0,255,136,0.12)',
    borderRadius: 10,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: '0.78rem',
  },
  secBadge: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: '0.58rem',
    color: 'rgba(232,244,253,0.2)',
    letterSpacing: '0.1em',
    paddingTop: 16,
    borderTop: '1px solid rgba(0,179,247,0.06)',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '2px solid rgba(0,179,247,0.15)',
    borderTopColor: '#00b3f7',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
}
