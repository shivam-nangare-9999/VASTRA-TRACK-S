import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { ToastProvider } from './components/Toast'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import Billing from './pages/Billing'
import Workers from './pages/Workers'
import Inventory from './pages/Inventory'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en')

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('lang', lang)
  }, [lang])

  useEffect(() => {
    fetchProfile()
  }, [session])

  async function fetchProfile() {
    if (session) {
      const { data } = await supabase.from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setProfile(data)
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: theme === 'dark' ? '#080810' : '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', color: '#f59e0b', fontSize: '18px', fontWeight: 700 }}>
        Loading...
      </div>
    </div>
  )

  if (!session) return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-[#080810] text-stone-900 dark:text-[#e2e8f0] transition-colors duration-300">
          <Sidebar session={session} theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} profile={profile} />
          <main className="flex-1 relative overflow-y-auto p-4 md:p-10" style={{
            background: theme === 'dark' ? 'radial-gradient(circle at 100% 0%, rgba(245,158,11,0.05), transparent 50%), #080810' : 'radial-gradient(circle at 100% 0%, rgba(245,158,11,0.03), transparent 50%), #f8fafc',
          }}>
            <Routes>
              {profile?.role === 'worker' ? (
                <>
                  <Route path="/orders" element={<Orders theme={theme} lang={lang} profile={profile} />} />
                  <Route path="*" element={<Navigate to="/orders" replace />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Dashboard theme={theme} lang={lang} profile={profile} />} />
                  <Route path="/customers" element={<Customers theme={theme} lang={lang} profile={profile} />} />
                  <Route path="/orders" element={<Orders theme={theme} lang={lang} profile={profile} />} />
                  <Route path="/billing" element={<Billing theme={theme} lang={lang} profile={profile} />} />
                  <Route path="/workers" element={<Workers theme={theme} lang={lang} profile={profile} />} />
                  <Route path="/inventory" element={<Inventory theme={theme} lang={lang} profile={profile} />} />
                  <Route path="/settings" element={<Settings theme={theme} lang={lang} profile={profile} onProfileUpdate={fetchProfile} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App