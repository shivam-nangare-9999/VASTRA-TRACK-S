export default function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction, theme }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '64px 24px',
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'relative',
        width: '120px', height: '120px',
        margin: '0 auto 24px',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: theme === 'dark'
            ? 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
          animation: 'skeleton-pulse 2s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: '20px',
          borderRadius: '50%',
          border: `2px dashed ${theme === 'dark' ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {Icon && <Icon size={36} color={theme === 'dark' ? '#524a3a' : '#d4c5a0'} strokeWidth={1.5} />}
        </div>
      </div>

      <h3 style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        fontSize: '18px',
        color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
        marginBottom: '8px',
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '14px',
        color: theme === 'dark' ? '#475569' : '#94a3b8',
        maxWidth: '320px',
        margin: '0 auto',
        lineHeight: 1.6,
      }}>
        {subtitle}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: '24px',
            padding: '10px 24px',
            borderRadius: '12px',
            border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.08)',
            color: '#f59e0b',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f59e0b'
            e.currentTarget.style.color = '#0f0f1a'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(245,158,11,0.08)'
            e.currentTarget.style.color = '#f59e0b'
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
