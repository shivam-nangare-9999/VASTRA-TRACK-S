import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Scissors, Eye, EyeOff, Sun, Moon } from 'lucide-react'
import { translations } from '../lib/translations'

export default function Login({ theme, setTheme, lang, setLang }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', brand_name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [btnHover, setBtnHover] = useState(false)

  async function handleLogin() {
    if (!form.email || !form.password) return setError('Please fill all fields')
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleSignup() {
    if (!form.brand_name) return setError('Please enter your brand name')
    if (!form.email || !form.password) return setError('Please fill all fields')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        brand_name: form.brand_name,
      })
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
    border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
    borderRadius: '16px',
    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
    fontSize: '14px',
    padding: '14px 16px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: theme === 'dark' ? '#080810' : '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: `radial-gradient(circle at 50% -20%, rgba(245,158,11,${theme === 'dark' ? '0.15' : '0.08'}), transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Theme Toggle in Login */}
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        style={{ position: 'fixed', top: '24px', right: '24px', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'white', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: '12px', padding: '10px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50 }}
      >
        {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div style={{
        width: '100%', maxWidth: '440px',
        background: theme === 'dark' ? 'rgba(13, 13, 26, 0.8)' : '#ffffff',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
        borderRadius: '32px',
        padding: '48px 40px',
        position: 'relative', zIndex: 1,
        boxShadow: theme === 'dark' ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            padding: '16px', borderRadius: '20px', marginBottom: '16px',
            boxShadow: theme === 'dark' ? '0 0 40px rgba(245,158,11,0.2)' : '0 10px 15px -3px rgba(245,158,11,0.3)',
          }}>
            <Scissors size={28} color="#1e1b4b" strokeWidth={2.5} />
          </div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '28px', fontWeight: 900,
            color: theme === 'dark' ? 'white' : '#0f172a', margin: '0 0 4px', letterSpacing: '-0.5px',
          }}>Vastra Track</h1>
          <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
            {mode === 'login' ? 'Sign in to your brand account' : 'Create your brand account'}
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
          borderRadius: '14px', padding: '4px', marginBottom: '24px',
          display: 'flex', gap: '4px'
        }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1,
              background: mode === m ? (theme === 'dark' ? 'rgba(245,158,11,0.15)' : '#ffffff') : 'rgba(0,0,0,0.02)',
              border: '1px solid transparent',
              borderColor: mode === m ? (theme === 'dark' ? 'rgba(245,158,11,0.3)' : '#e2e8f0') : 'transparent',
              borderRadius: '10px', padding: '10px',
              color: mode === m ? (theme === 'dark' ? '#fbbf24' : '#f59e0b') : '#64748b',
              fontWeight: 700, fontSize: '14px',
              cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: 'Inter, sans-serif',
              boxShadow: mode === m && theme !== 'dark' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
              {m === 'login' ? '🔑 Sign In' : '✨ Sign Up'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'signup' && (
            <div>
              <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>
                BRAND NAME
              </label>
              <input type="text" placeholder="Cotton King, Tizer..."
                value={form.brand_name}
                onChange={e => setForm({...form, brand_name: e.target.value})}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                onBlur={e => e.target.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}
              />
            </div>
          )}

          <div>
            <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>
              EMAIL
            </label>
            <input type="email" placeholder="brand@email.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#f59e0b'}
              onBlur={e => e.target.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}
            />
          </div>

          <div>
            <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
                style={{ ...inputStyle, paddingRight: '48px' }}
                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                onBlur={e => e.target.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}
              />
              <button onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: '14px', top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: '#475569', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '12px', padding: '12px',
              color: '#f87171', fontSize: '13px',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={mode === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              width: '100%',
              background: loading ? 'rgba(245,158,11,0.3)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              border: 'none', borderRadius: '14px', padding: '15px',
              color: loading ? '#64748b' : '#1e1b4b',
              fontWeight: 800, fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Syne, sans-serif',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              marginTop: '4px',
              transform: btnHover && !loading ? 'translateY(-2px)' : 'none',
              boxShadow: btnHover && !loading ? '0 15px 30px -5px rgba(245, 158, 11, 0.5)' : (!loading ? '0 10px 20px -5px rgba(245, 158, 11, 0.4)' : 'none'),
            }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Processing...</span>
              </div>
            ) : (
              mode === 'login' ? 'Sign In →' : 'Create Account →'
            )}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#334155', fontSize: '12px' }}>
          Powered by Vastra Track · Built for Tailors
        </p>
      </div>
    </div>
  )
}