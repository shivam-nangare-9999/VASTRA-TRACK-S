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
    background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff',
    border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
    borderRadius: '14px',
    color: theme === 'dark' ? 'white' : '#0f172a',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
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
        background: `radial-gradient(ellipse at 50% 0%, rgba(245,158,11,${theme === 'dark' ? '0.08' : '0.04'}), transparent 60%)`,
        pointerEvents: 'none',
      }} />

      {/* Theme Toggle in Login */}
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        style={{ position: 'fixed', top: '24px', right: '24px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
      >
        {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div style={{
        width: '100%', maxWidth: '440px',
        background: theme === 'dark' ? 'linear-gradient(135deg, #0d0d1a, #111122)' : '#ffffff',
        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
        borderRadius: '28px',
        padding: '40px',
        position: 'relative',
        boxShadow: theme === 'dark' ? 'none' : '0 10px 25px -5px rgba(0,0,0,0.05)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            padding: '16px', borderRadius: '20px', marginBottom: '16px',
            boxShadow: '0 0 30px rgba(245,158,11,0.3)',
          }}>
            <Scissors size={28} color="#0d0d1a" strokeWidth={2.5} />
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
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '14px', padding: '4px', marginBottom: '24px',
          display: 'flex', gap: '4px'
        }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1,
              background: mode === m ? 'rgba(245,158,11,0.2)' : 'transparent',
              border: mode === m ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
              borderRadius: '10px', padding: '10px',
              color: mode === m ? '#f59e0b' : '#475569',
              fontWeight: 700, fontSize: '14px',
              cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'Inter, sans-serif',
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
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
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
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
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
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
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
            style={{
              width: '100%',
              background: loading ? 'rgba(245,158,11,0.3)' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
              border: 'none', borderRadius: '14px', padding: '15px',
              color: loading ? '#64748b' : '#0d0d1a',
              fontWeight: 800, fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Syne, sans-serif',
              transition: 'opacity 0.2s', marginTop: '4px',
            }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#334155', fontSize: '12px' }}>
          Powered by Vastra Track · Built for Tailors
        </p>
      </div>
    </div>
  )
}