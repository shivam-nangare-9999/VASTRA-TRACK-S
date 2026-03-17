import { useState, useEffect } from 'react'
import { Users, ShoppingBag, Clock, CheckCircle, AlertCircle, TrendingUp, ArrowUpRight, X, Plus, UserPlus, UserCog, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { translations } from '../lib/translations'

export default function Dashboard({ theme, lang }) {
  const navigate = useNavigate()
  const t = translations[lang] || translations['en'] || {}
  const [stats, setStats] = useState({
    totalCustomers: 0, totalOrders: 0,
    pendingOrders: 0, readyOrders: 0,
    totalRevenue: 0, pendingPayments: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [modal, setModal] = useState(null) 
  const [modalData, setModalData] = useState([])
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      const results = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Ready'),
        supabase.from('orders').select('total_price, advance_paid'),
        supabase.from('orders').select('*, customers(name), workers(name)').order('created_at', { ascending: false }).limit(5),
      ])

      const totalCustomers = results[0].count || 0
      const totalOrders = results[1].count || 0
      const pendingOrders = results[2].count || 0
      const readyOrders = results[3].count || 0
      const ordersData = results[4].data || []
      let recentOrdersData = results[5].data

      // Fallback: If workers join failed (e.g. column missing), try without it
      if (results[5].error) {
        const fallback = await supabase.from('orders').select('*, customers(name)').order('created_at', { ascending: false }).limit(5)
        recentOrdersData = fallback.data
      }

      const totalRevenue = ordersData.reduce((s, o) => s + (o.total_price || 0), 0)
      const pendingPayments = ordersData.reduce((s, o) => s + ((o.total_price || 0) - (o.advance_paid || 0)), 0)
      
      setStats({ totalCustomers, totalOrders, pendingOrders, readyOrders, totalRevenue, pendingPayments })
      setRecentOrders(recentOrdersData || [])
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  async function openModal(type) {
    setModal(type)
    setModalLoading(true)
    setModalData([])

    let query = supabase.from('orders').select('*, customers(name, phone)')
    
    if (type === 'pending') query = query.eq('status', 'Pending')
    else if (type === 'ready') query = query.eq('status', 'Ready')
    else if (type === 'revenue') query = query.order('total_price', { ascending: false })

    const { data } = await query.order('created_at', { ascending: false })
    
    if (type === 'pendingPayments') {
      setModalData((data || []).filter(o => o.total_price > o.advance_paid))
    } else {
      setModalData(data || [])
    }
    setModalLoading(false)
  }

  const statusColors = {
    'Pending':   { bg: 'rgba(251,146,60,0.1)', color: '#fb923c' },
    'Cutting':   { bg: 'rgba(96,165,250,0.1)', color: '#60a5fa' },
    'Stitching': { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa' },
    'Ready':     { bg: 'rgba(74,222,128,0.1)', color: '#4ade80' },
    'Delivered': { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' },
  }

  const statCards = [
    {
      label: t.totalCustomers,
      value: stats.totalCustomers,
      icon: Users,
      color: '#60a5fa',
      glow: 'rgba(96,165,250,0.15)',
      action: () => navigate('/customers'),
      actionLabel: '→ Go to Customers',
    },
    {
      label: t.totalOrders,
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: '#f59e0b',
      glow: 'rgba(245,158,11,0.15)',
      action: () => openModal('orders'),
      actionLabel: '→ View All Orders',
    },
    {
      label: t.pendingOrders,
      value: stats.pendingOrders,
      icon: Clock,
      color: '#fb923c',
      glow: 'rgba(251,146,60,0.15)',
      action: () => openModal('pending'),
      actionLabel: '→ View Pending',
    },
    {
      label: t.readyToDeliver,
      value: stats.readyOrders,
      icon: CheckCircle,
      color: '#4ade80',
      glow: 'rgba(74,222,128,0.15)',
      action: () => openModal('ready'),
      actionLabel: '→ View Ready',
    },
    {
      label: t.totalRevenue,
      value: `₨${stats.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.15)',
      action: () => openModal('revenue'),
      actionLabel: '→ View Revenue',
    },
    {
      label: t.pendingPayments,
      value: `₨${stats.pendingPayments.toLocaleString()}`,
      icon: AlertCircle,
      color: '#f87171',
      glow: 'rgba(248,113,113,0.15)',
      action: () => openModal('pendingPayments'),
      actionLabel: '→ View Pending Payments',
    },
  ]

  const cardBorder = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const quickActions = [
    { label: t.newOrder, icon: Plus, action: () => navigate('/orders'), color: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
    { label: t.addCustomer, icon: UserPlus, action: () => navigate('/customers'), color: '#10b981', glow: 'rgba(16,185,129,0.4)' },
    { label: t.newWorker, icon: UserCog, action: () => navigate('/workers'), color: '#6366f1', glow: 'rgba(99,102,241,0.4)' },
  ]

  const modalTitles = {
    orders: 'All Orders',
    pending: 'Pending Orders',
    ready: 'Ready to Deliver',
    revenue: 'Revenue by Order',
    pendingPayments: 'Pending Payments',
  }

  return (
    <div style={{ padding: '0 8px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
            width: '5px', height: '32px',
            background: 'linear-gradient(180deg, #f59e0b, #ef4444)',
            borderRadius: '10px',
          }} />
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '32px', fontWeight: 800,
            color: theme === 'dark' ? '#ffffff' : '#0f172a', letterSpacing: '-0.5px',
            }}>{t.dashboard}</h2>
          </div>
          <p style={{ color: '#475569', fontSize: '14px', marginLeft: '14px' }}>
            {t.welcome} — {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              onClick={qa.action}
              style={{
                background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
                padding: '14px 24px',
                borderRadius: '16px',
                color: theme === 'dark' ? '#f8fafc' : '#1e293b',
                fontSize: '13px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: theme === 'dark' ? '0 10px 20px -10px rgba(0,0,0,0.5)' : '0 10px 20px -10px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = qa.color
                e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff'
                e.currentTarget.style.boxShadow = `0 15px 25px -5px ${qa.glow}`
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
                e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'
                e.currentTarget.style.boxShadow = theme === 'dark' ? '0 10px 20px -10px rgba(0,0,0,0.5)' : '0 10px 20px -10px rgba(0,0,0,0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <qa.icon size={16} color={qa.color} />
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {statCards.map(({ label, value, icon: Icon, color, glow, action, actionLabel }) => (
          <div
            className="group transition-all duration-300 ease-in-out cursor-pointer hover:-translate-y-1.5"
            key={label}
            onClick={action}
            style={{
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${cardBorder}`,
              borderRadius: '28px',
              padding: '24px',
              boxShadow: theme === 'dark' ? '0 10px 30px -10px rgba(0, 0, 0, 0.5)' : '0 10px 30px -10px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Background glow */}
            <div style={{
              position: 'absolute', top: '-30px', right: '-30px',
              width: '120px', height: '120px',
              background: `radial-gradient(circle, ${color}20, transparent 80%)`,
              borderRadius: '50%',
            }} />

            <div style={{
              background: theme === 'dark' ? `${color}15` : `${color}10`,
              width: '48px', height: '48px',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px',
              border: `1px solid ${color}20`,
            }}> 
             
              <Icon size={22} color={color} />
            </div>

            <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {label}
            </p>
            <p style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '32px', 
              fontWeight: 800,
              color: loading ? '#1e293b' : (theme === 'dark' ? '#ffffff' : '#0f172a'),
              letterSpacing: '-1px',
              marginBottom: '16px',
            }}>
              {loading ? '···' : value}
            </p>
            <p style={{ fontSize: '12px', color: color, fontWeight: 800, marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {actionLabel}
            </p>

            <div style={{ position: 'absolute', bottom: '16px', right: '16px' }}>
              <ArrowUpRight size={18} color={color} opacity={0.3} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="transition-all duration-500" style={{
        background: theme === 'dark' ? 'rgba(255, 255, 255, 0.01)' : '#ffffff',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${cardBorder}`,
        borderRadius: '32px',
        overflow: 'hidden', 
        boxShadow: theme === 'dark' ? '0 30px 60px -12px rgba(0,0,0,0.5)' : '0 20px 40px -12px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '28px 36px',
          borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px', height: '8px', background: '#f59e0b',
              borderRadius: '50%', boxShadow: '0 0 10px #f59e0b',
            }} />
            <h3 style={{ 
              fontFamily: 'Syne, sans-serif', fontWeight: 700, 
              color: theme === 'dark' ? '#f8fafc' : '#0f172a', fontSize: '15px' 
            }}>
              Recent Orders
            </h3>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last 5 orders</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px', color: '#64748b' }}>Loading stats...</div>
        ) : recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <ShoppingBag size={42} color={theme === 'dark' ? '#1e293b' : '#e2e8f0'} style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>No orders found in the database</p>
          </div>
        ) : (
          <>
            <div className={`hidden md:grid grid-cols-5 px-9 py-4 border-b ${theme === 'dark' ? 'border-white/5' : 'border-stone-100'} text-[10px] text-[#64748b] font-black tracking-[0.1em] uppercase opacity-70`}>
              <span>{t.customer}</span><span>{t.item}</span><span>{t.balance}</span><span>{t.workers}</span><span>{t.status}</span>
            </div>
            {recentOrders.map((order, i) => {
              const s = statusColors[order.status] || statusColors['Pending']
              return (
                <div key={order.id} className={`grid grid-cols-2 md:grid-cols-5 p-6 md:px-9 md:py-5 border-b ${theme === 'dark' ? 'border-white/5' : 'border-stone-50'} items-center transition-all duration-300 cursor-default last:border-0 hover:z-10`}
                  onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ color: theme === 'dark' ? '#f1f5f9' : '#1e293b', fontWeight: 600, fontSize: '14px' }}>
                    {order.customers?.name}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>{t.garments[order.item_name] || order.item_name}</span>
                  <span style={{ color: '#fb923c', fontWeight: 600, fontSize: '13px' }}>
                    ₨{(order.total_price - order.advance_paid).toLocaleString()}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>{order.workers?.name || '—'}</span>
                  <span style={{
                    background: s.bg, color: s.color,
                    fontSize: '11px', fontWeight: 700,
                    padding: '4px 10px', borderRadius: '20px',
                    display: 'inline-block', letterSpacing: '0.3px',
                  }}>{t[order.status.toLowerCase()] || order.status}</span>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '20px',
        }}>
          <div style={{
            background: theme === 'dark' ? '#0d0d1a' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
            borderRadius: '24px',
            width: '100%', maxWidth: '800px',
            maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h3 style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800, fontSize: '18px', 
                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
              }}>{modalTitles[modal]}</h3>
              <button
                onClick={() => setModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none', borderRadius: '10px',
                  padding: '6px', cursor: 'pointer', color: '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#334155' }}>
                  Loading...
                </div>
              ) : modalData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#334155' }}>
                  No data found.
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="hidden md:grid grid-cols-5 px-6 py-2.5 text-[11px] text-[#334155] font-bold tracking-wider uppercase border-b border-white/5">
                    <span>Customer</span>
                    <span>Item</span>
                    <span>Total</span>
                    <span>Paid</span>
                    <span>
                      {modal === 'pendingPayments' ? 'Balance' :
                       modal === 'revenue' ? 'Revenue' : 'Status'}
                    </span>
                  </div>

                  {/* Table Rows */}
                  {modalData.map((order, i) => {
                    const balance = order.total_price - order.advance_paid
                    const s = statusColors[order.status] || statusColors['Pending']
                    return (
                      <div key={order.id} className="grid grid-cols-2 md:grid-cols-5 p-4 md:px-6 md:py-3.5 border-b border-white/5 items-center transition-colors gap-y-2 last:border-0"
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <p style={{ color: theme === 'dark' ? '#f1f5f9' : '#1e293b', fontWeight: 600, fontSize: '14px' }}>
                            {order.customers?.name}
                          </p>
                          {order.customers?.phone && (
                            <p style={{ color: '#64748b', fontSize: '11px' }}>
                              {order.customers.phone}
                            </p>
                          )}
                        </div>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>
                          {t.garments[order.item_name] || order.item_name}
                        </span>
                        <span style={{ color: theme === 'dark' ? '#f1f5f9' : '#1e293b', fontSize: '13px' }}>
                          ₨{order.total_price?.toLocaleString()}
                        </span>
                        <span style={{ color: '#16a34a', fontSize: '13px' }}>
                          ₨{order.advance_paid?.toLocaleString()}
                        </span>
                        <span>
                          {modal === 'pendingPayments' ? (
                            <span style={{ color: '#f87171', fontWeight: 700, fontSize: '13px' }}>
                              ₨{balance.toLocaleString()}
                            </span>
                          ) : modal === 'revenue' ? (
                            <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '13px' }}>
                              ₨{order.total_price?.toLocaleString()}
                            </span>
                          ) : (
                            <span style={{
                              background: s.bg, color: s.color,
                              fontSize: '11px', fontWeight: 700,
                              padding: '4px 10px', borderRadius: '20px',
                              display: 'inline-block',
                            }}>{order.status}</span>
                          )}
                        </span>
                      </div>
                    )
                  })}

                  {/* Modal Footer Summary */}
                  {(modal === 'revenue' || modal === 'pendingPayments') && (
                    <div style={{
                      padding: '16px 24px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', justifyContent: 'flex-end',
                      gap: '24px',
                    }}>
                      {modal === 'revenue' && (
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ color: '#475569', fontSize: '12px' }}>Total Revenue</p>
                          <p style={{
                            color: '#a78bfa', fontWeight: 800, fontSize: '20px',
                            fontFamily: 'Syne, sans-serif',
                          }}>
                            ₨{modalData.reduce((s, o) => s + (o.total_price || 0), 0).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {modal === 'pendingPayments' && (
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ color: '#475569', fontSize: '12px' }}>Total Pending</p>
                          <p style={{
                            color: '#f87171', fontWeight: 800, fontSize: '20px',
                            fontFamily: 'Syne, sans-serif',
                          }}>
                            ₨{modalData.reduce((s, o) => s + (o.total_price - o.advance_paid), 0).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}