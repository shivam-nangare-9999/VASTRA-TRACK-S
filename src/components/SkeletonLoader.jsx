export function SkeletonCard({ theme, count = 1 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} style={{
      background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff',
      border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      borderRadius: '28px',
      padding: '24px',
      overflow: 'hidden',
    }}>
      <div className="skeleton-pulse" style={{
        width: '48px', height: '48px', borderRadius: '16px',
        background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        marginBottom: '16px',
      }} />
      <div className="skeleton-pulse" style={{
        width: '60%', height: '12px', borderRadius: '6px',
        background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        marginBottom: '10px',
      }} />
      <div className="skeleton-pulse" style={{
        width: '40%', height: '28px', borderRadius: '8px',
        background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        marginBottom: '16px',
      }} />
      <div className="skeleton-pulse" style={{
        width: '50%', height: '10px', borderRadius: '5px',
        background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      }} />
    </div>
  ))
}

export function SkeletonRow({ theme, count = 5, cols = 6 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      padding: '16px 24px',
      borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      gap: '12px',
      alignItems: 'center',
    }}>
      {Array.from({ length: cols }).map((_, j) => (
        <div key={j} className="skeleton-pulse" style={{
          height: j === 0 ? '14px' : '12px',
          width: j === 0 ? '80%' : j === cols - 1 ? '50%' : '60%',
          borderRadius: '6px',
          background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }} />
      ))}
    </div>
  ))
}

export function SkeletonWorkerCard({ theme, count = 3 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} style={{
      background: theme === 'dark' ? 'rgba(15,15,30,1)' : '#ffffff',
      border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      borderRadius: '16px',
      padding: '20px',
    }}>
      <div className="skeleton-pulse" style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        marginBottom: '12px',
      }} />
      <div className="skeleton-pulse" style={{
        width: '70%', height: '16px', borderRadius: '6px',
        background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        marginBottom: '8px',
      }} />
      <div className="skeleton-pulse" style={{
        width: '50%', height: '12px', borderRadius: '6px',
        background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        marginBottom: '16px',
      }} />
      <div style={{
        borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        paddingTop: '16px',
      }}>
        <div className="skeleton-pulse" style={{
          width: '100%', height: '40px', borderRadius: '12px',
          background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        }} />
      </div>
    </div>
  ))
}
