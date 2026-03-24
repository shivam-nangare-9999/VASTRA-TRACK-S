import { useState, useEffect } from 'react'
import { Users, ShoppingBag, Clock, CheckCircle, AlertCircle, TrendingUp, ArrowUpRight, X, Plus, UserPlus, UserCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { translations } from '../lib/translations'
import { SkeletonCard, SkeletonRow } from '../components/SkeletonLoader'
import EmptyState from '../components/EmptyState'

export default function Dashboard({ theme, lang }) {
  const navigate = useNavigate()
  const t = translations[lang] || translations['en'] || {}
  const [stats, setStats] = useState({
    totalCustomers: 0, totalOrders: 0,
    pendingOrders: 0, readyOrders: 0,
    totalRevenue: 0, pendingPayments: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [urgentOrders, setUrgentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState([])
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      const results = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Ready'),
        supabase.from('orders').select('total_price, advance_paid'),
        supabase.from('orders').select('*, customers(name), workers(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('*, customers(name, phone)').in('status', ['Pending', 'Cutting', 'Stitching']).lte('due_date', tomorrowStr).gte('due_date', '2000-01-01').order('due_date', { ascending: true })
      ])

      const totalCustomers = results[0].count || 0
      const totalOrders = results[1].count || 0
      const pendingOrders = results[2].count || 0
      const readyOrders = results[3].count || 0
      const ordersData = results[4].data || []
      let recentOrdersData = results[5].data
      let urgentData = results[6].data || []

      if (results[5].error) {
        const fallback = await supabase.from('orders').select('*, customers(name)').order('created_at', { ascending: false }).limit(5)
        recentOrdersData = fallback.data
      }

      const totalRevenue = ordersData.reduce((s, o) => s + (o.total_price || 0), 0)
      const pendingPayments = ordersData.reduce((s, o) => s + ((o.total_price || 0) - (o.advance_paid || 0)), 0)

      setStats({ totalCustomers, totalOrders, pendingOrders, readyOrders, totalRevenue, pendingPayments })
      setRecentOrders(recentOrdersData || [])
      setUrgentOrders(urgentData)
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
    'Pending':   'bg-orange-400/10 text-orange-400',
    'Cutting':   'bg-blue-400/10 text-blue-400',
    'Stitching': 'bg-purple-400/10 text-purple-400',
    'Ready':     'bg-green-400/10 text-green-400',
    'Delivered': 'bg-stone-400/10 text-stone-400',
  }

  const statCards = [
    { label: t.totalCustomers, value: stats.totalCustomers, icon: Users, color: 'blue', action: () => navigate('/customers'), actionLabel: t.goToCustomers },
    { label: t.totalOrders, value: stats.totalOrders, icon: ShoppingBag, color: 'amber', action: () => openModal('orders'), actionLabel: t.viewAllOrders },
    { label: t.pendingOrders, value: stats.pendingOrders, icon: Clock, color: 'orange', action: () => openModal('pending'), actionLabel: t.viewPending },
    { label: t.readyToDeliver, value: stats.readyOrders, icon: CheckCircle, color: 'green', action: () => openModal('ready'), actionLabel: t.viewReady },
    { label: t.totalRevenue, value: `₨${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'purple', action: () => openModal('revenue'), actionLabel: t.viewRevenue },
    { label: t.pendingPayments, value: `₨${stats.pendingPayments.toLocaleString()}`, icon: AlertCircle, color: 'red', action: () => openModal('pendingPayments'), actionLabel: t.viewPendingPayments },
  ]

  const colorMap = {
    blue:   { iconBg: 'bg-blue-400/10', iconText: 'text-blue-400', border: 'border-blue-400/20', actionText: 'text-blue-400' },
    amber:  { iconBg: 'bg-amber-500/10', iconText: 'text-amber-500', border: 'border-amber-500/20', actionText: 'text-amber-500' },
    orange: { iconBg: 'bg-orange-400/10', iconText: 'text-orange-400', border: 'border-orange-400/20', actionText: 'text-orange-400' },
    green:  { iconBg: 'bg-green-400/10', iconText: 'text-green-400', border: 'border-green-400/20', actionText: 'text-green-400' },
    purple: { iconBg: 'bg-purple-400/10', iconText: 'text-purple-400', border: 'border-purple-400/20', actionText: 'text-purple-400' },
    red:    { iconBg: 'bg-red-400/10', iconText: 'text-red-400', border: 'border-red-400/20', actionText: 'text-red-400' },
  }

  const quickActions = [
    { label: t.newOrder, icon: Plus, action: () => navigate('/orders'), colorCls: 'text-amber-500 border-amber-500/30 hover:bg-amber-500/10' },
    { label: t.addCustomer, icon: UserPlus, action: () => navigate('/customers'), colorCls: 'text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10' },
    { label: t.newWorker, icon: UserCog, action: () => navigate('/workers'), colorCls: 'text-indigo-500 border-indigo-500/30 hover:bg-indigo-500/10' },
  ]

  const modalTitles = {
    orders: t.allOrders,
    pending: t.pendingOrdersTitle,
    ready: t.readyToDeliverTitle,
    revenue: t.revenueByOrder,
    pendingPayments: t.pendingPaymentsTitle,
  }

  return (
    <div className="max-w-[1400px] mx-auto px-2">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-5 mb-10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-1.5 h-8 bg-gradient-to-b from-amber-500 to-red-500 rounded-full" />
            <h2 className="font-syne text-3xl font-bold text-stone-900 dark:text-white tracking-tight">{t.dashboard}</h2>
          </div>
          <p className="text-stone-500 text-sm ml-3.5">
            {t.welcome} — {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="flex gap-3">
          {quickActions.map(qa => (
            <button key={qa.label} onClick={qa.action}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl border bg-white dark:bg-white/[0.03] font-semibold text-[13px] transition-all duration-300 hover:-translate-y-0.5 shadow-sm dark:shadow-lg ${qa.colorCls}`}>
              <qa.icon size={16} />
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <SkeletonCard theme={theme} count={6} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {statCards.map(({ label, value, icon: Icon, color, action, actionLabel }) => {
            const cm = colorMap[color]
            return (
              <div key={label} onClick={action}
                className="group relative cursor-pointer transition-all duration-300 hover:-translate-y-1.5 bg-white dark:bg-white/[0.03] backdrop-blur-md border border-stone-200/60 dark:border-white/[0.08] rounded-[28px] p-6 shadow-sm dark:shadow-xl overflow-hidden">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${cm.iconBg} border ${cm.border}`}>
                  <Icon size={22} className={cm.iconText} />
                </div>
                <p className="text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
                <p className="font-syne text-3xl font-semibold text-stone-900 dark:text-white tracking-tight mb-4">{value}</p>
                <p className={`text-xs font-medium flex items-center gap-1 ${cm.actionText}`}>
                  {actionLabel}
                </p>
                <div className="absolute bottom-4 right-4">
                  <ArrowUpRight size={18} className={`${cm.iconText} opacity-30`} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Urgent Orders (Due Tomorrow) */}
      {!loading && urgentOrders.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 mb-10 overflow-hidden shadow-sm animate-pulse-slow">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-red-600 dark:text-red-400 font-semibold text-lg tracking-tight">{t.urgentOrders}</h3>
              <p className="text-red-500/80 text-xs font-medium">{t.dueTomorrow} ({urgentOrders.length})</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {urgentOrders.slice(0, 6).map(order => {
              const due = new Date(order.due_date)
              const today = new Date()
              const isToday = due.toDateString() === today.toDateString()
              
              return (
                <div key={order.id} onClick={() => navigate('/orders')}
                  className="bg-white/50 dark:bg-black/20 border border-red-500/20 rounded-2xl p-4 cursor-pointer hover:bg-white/80 dark:hover:bg-black/40 transition-colors flex justify-between items-center group">
                  <div>
                    <p className="font-semibold text-stone-900 dark:text-white text-sm mb-1">{order.customers?.name}</p>
                    <p className="text-stone-500 text-xs">{t.garments[order.item_name] || order.item_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-md ${isToday ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                      {isToday ? t.dueToday : t.dueTomorrow}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-2">({t[order.status.toLowerCase()] || order.status})</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white dark:bg-white/[0.01] backdrop-blur-md border border-stone-200/60 dark:border-white/[0.08] rounded-[32px] overflow-hidden shadow-sm dark:shadow-xl mb-10">
        <div className="flex items-center justify-between px-8 py-6 border-b border-stone-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_10px_#f59e0b]" />
            <h3 className="font-syne font-semibold text-stone-900 dark:text-white text-[15px]">{t.recentOrders}</h3>
          </div>
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">{t.last5}</span>
        </div>

        {loading ? (
          <div className="py-2"><SkeletonRow theme={theme} count={5} cols={5} /></div>
        ) : recentOrders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title={t.noOrdersFound} subtitle={t.noOrdersSubtitle}
            actionLabel={`+ ${t.newOrder}`} onAction={() => navigate('/orders')} theme={theme} />
        ) : (
          <>
            <div className="hidden md:grid grid-cols-5 px-8 py-3 border-b border-stone-100 dark:border-white/5 text-[10px] text-stone-500 font-medium tracking-[0.1em] uppercase opacity-70">
              <span>{t.customer}</span><span>{t.item}</span><span>{t.balance}</span><span>{t.workers}</span><span>{t.status}</span>
            </div>
            {recentOrders.map(order => (
              <div key={order.id}
                className="grid grid-cols-2 md:grid-cols-5 px-8 py-4 border-b border-stone-50 dark:border-white/5 items-center transition-all duration-300 hover:bg-stone-50/50 dark:hover:bg-white/[0.02] last:border-0">
                <span className="text-stone-900 dark:text-white font-medium text-sm">{order.customers?.name}</span>
                <span className="text-stone-500 text-[13px]">{t.garments[order.item_name] || order.item_name}</span>
                <span className="text-orange-400 font-medium text-[13px]">₨{((order.total_price || 0) - (order.advance_paid || 0)).toLocaleString()}</span>
                <span className="text-stone-500 text-[13px]">{order.workers?.name || '—'}</span>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full inline-block w-fit ${statusColors[order.status] || 'bg-stone-400/10 text-stone-400'}`}>
                  {t[order.status.toLowerCase()] || order.status}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-5">
          <div className={`w-full max-w-[800px] max-h-[80vh] flex flex-col overflow-hidden rounded-3xl border ${
            theme === 'dark' ? 'bg-[#0d0d1a] border-stone-800' : 'bg-white border-stone-200'
          }`}>
            <div className={`flex justify-between items-center px-6 py-5 border-b ${theme === 'dark' ? 'border-stone-800' : 'border-stone-200'}`}>
              <h3 className="font-syne font-semibold text-lg text-stone-900 dark:text-white">{modalTitles[modal]}</h3>
              <button onClick={() => setModal(null)}
                className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {modalLoading ? (
                <div className="py-2"><SkeletonRow theme={theme} count={5} cols={5} /></div>
              ) : modalData.length === 0 ? (
                <EmptyState icon={ShoppingBag} title={t.noDataFound} subtitle={t.noDataSubtitle} theme={theme} />
              ) : (
                <>
                  <div className={`hidden md:grid grid-cols-5 px-6 py-2.5 text-[11px] font-semibold tracking-wider uppercase border-b ${theme === 'dark' ? 'border-stone-800 text-stone-500' : 'border-stone-200 text-stone-500'}`}>
                    <span>{t.customer}</span>
                    <span>{t.item}</span>
                    <span>{t.total}</span>
                    <span>{t.paid}</span>
                    <span>{modal === 'pendingPayments' ? t.balance : modal === 'revenue' ? t.totalRevenue : t.status}</span>
                  </div>
                  {modalData.map(order => {
                    const balance = (order.total_price || 0) - (order.advance_paid || 0)
                    return (
                      <div key={order.id}
                        className={`grid grid-cols-2 md:grid-cols-5 px-6 py-3.5 border-b items-center gap-y-2 last:border-0 transition-colors ${
                          theme === 'dark' ? 'border-stone-800 hover:bg-stone-800/30' : 'border-stone-100 hover:bg-stone-50'
                        }`}>
                        <div>
                          <p className="text-stone-900 dark:text-white font-medium text-sm">{order.customers?.name}</p>
                          {order.customers?.phone && <p className="text-stone-500 text-[11px]">{order.customers.phone}</p>}
                        </div>
                        <span className="text-stone-500 text-[13px]">{t.garments[order.item_name] || order.item_name}</span>
                        <span className="text-stone-900 dark:text-stone-200 text-[13px]">₨{(order.total_price || 0).toLocaleString()}</span>
                        <span className="text-green-400 text-[13px]">₨{(order.advance_paid || 0).toLocaleString()}</span>
                        <span>
                          {modal === 'pendingPayments' ? (
                            <span className="text-red-400 font-semibold text-[13px]">₨{balance.toLocaleString()}</span>
                          ) : modal === 'revenue' ? (
                            <span className="text-purple-400 font-semibold text-[13px]">₨{(order.total_price || 0).toLocaleString()}</span>
                          ) : (
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full inline-block ${statusColors[order.status] || ''}`}>
                              {t[order.status.toLowerCase()] || order.status}
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                  {(modal === 'revenue' || modal === 'pendingPayments') && (
                    <div className={`px-6 py-4 border-t flex justify-end gap-6 ${theme === 'dark' ? 'border-stone-800' : 'border-stone-200'}`}>
                      {modal === 'revenue' && (
                        <div className="text-right">
                          <p className="text-stone-500 text-xs">{t.totalRevenue}</p>
                          <p className="text-purple-400 font-semibold text-xl font-syne">
                            ₨{modalData.reduce((s, o) => s + (o.total_price || 0), 0).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {modal === 'pendingPayments' && (
                        <div className="text-right">
                          <p className="text-stone-500 text-xs">{t.totalPending}</p>
                          <p className="text-red-400 font-semibold text-xl font-syne">
                            ₨{modalData.reduce((s, o) => s + ((o.total_price || 0) - (o.advance_paid || 0)), 0).toLocaleString()}
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