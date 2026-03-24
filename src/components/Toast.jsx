import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)', text: '#4ade80', icon: '#4ade80' },
  error:   { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', text: '#f87171', icon: '#f87171' },
  warning: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', text: '#fbbf24', icon: '#fbbf24' },
  info:    { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', text: '#60a5fa', icon: '#60a5fa' },
}

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false)
  const Icon = icons[toast.type] || icons.info
  const c = colors[toast.type] || colors.info

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss(toast.id), 300)
    }, toast.duration || 3500)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(16px)',
        borderRadius: '14px',
        padding: '14px 18px',
        minWidth: '300px', maxWidth: '440px',
        boxShadow: '0 20px 40px -12px rgba(0,0,0,0.4)',
        animation: exiting ? 'toast-exit 0.3s ease forwards' : 'toast-enter 0.35s ease',
        pointerEvents: 'auto',
      }}
    >
      <Icon size={20} color={c.icon} style={{ flexShrink: 0 }} />
      <p style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: c.text, lineHeight: 1.4, margin: 0 }}>
        {toast.message}
      </p>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
      >
        <X size={14} color={c.text} opacity={0.6} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column-reverse', gap: '10px',
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
