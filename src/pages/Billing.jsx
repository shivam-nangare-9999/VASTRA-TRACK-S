import { Receipt, Printer, Plus, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'
import { SkeletonRow } from '../components/SkeletonLoader'
import EmptyState from '../components/EmptyState'
import Pagination, { usePagination } from '../components/Pagination'
import { useToast } from '../components/Toast'
import QRCode from 'qrcode'

export default function Billing({ theme, lang, profile }) {
  const t = translations[lang]
  const showToast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [receiptLang, setReceiptLang] = useState(lang)
  const [paymentOrder, setPaymentOrder] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const receiptRef = useRef()

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  async function recordPayment() {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) return showToast(t.amountReceived + ' is required', 'warning')

    const order = paymentOrder
    const balance = order.total_price - order.advance_paid

    if (amount > balance) {
      return showToast(`${t.balance}: ₨${balance}`, 'warning')
    }

    setSavingPayment(true)
    const newAdvance = order.advance_paid + amount

    const { error } = await supabase
      .from('orders')
      .update({ advance_paid: newAdvance })
      .eq('id', order.id)

    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast(`${t.confirmPayment} ✓ — ₨${amount.toLocaleString()}`, 'success')
      setPaymentAmount('')
      setPaymentOrder(null)
      fetchOrders()
    }
    setSavingPayment(false)
  }

  async function printReceipt(order) {
    setSelectedOrder(order)
    try {
      const qrText = order.order_number || `VT-${order.id.slice(0, 8).toUpperCase()}`
      const url = await QRCode.toDataURL(qrText, {
        width: 100, margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
      setQrDataUrl(url)
    } catch (err) {
      console.log('QR generation failed:', err)
      setQrDataUrl('')
    }
  }

  const doPrint = () => {
    const pt = translations[receiptLang] || t
    const win = window.open('', '', 'width=450,height=800')
    win.document.write(`
      <html>
        <head>
          <title>${pt.receipt} — ${selectedOrder.order_number || selectedOrder.id.slice(0, 8)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif; 
              padding: 20px; 
              font-size: 13px; 
              max-width: 320px; 
              margin: 0 auto; 
              color: #1a1a1a;
              line-height: 1.4;
            }
            .center { text-align: center; }
            .qr-img { width: 80px; height: 80px; margin: 0 auto; display: block; }
            .brand { font-size: 16px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
            .tagline { font-size: 10px; color: #666; margin: 2px 0; }
            .receipt-id { font-size: 10px; color: #999; }
            .total-row { font-size: 14px; font-weight: 900; }
            @media print { body { max-width: 100%; padding: 4px; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0)
  const totalReceived = orders.reduce((sum, o) => sum + (o.advance_paid || 0), 0)
  const totalPending = totalRevenue - totalReceived

  const filtered = orders.filter(o => {
    if (filter === 'Paid') return o.total_price <= o.advance_paid
    if (filter === 'Unpaid') return o.total_price > o.advance_paid
    return true
  })

  const { totalPages, getPageItems } = usePagination(filtered, PAGE_SIZE)
  const paginatedOrders = getPageItems(currentPage)

  useEffect(() => { setCurrentPage(1) }, [filter])

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-stone-900 dark:text-white">{t.billing}</h2>
        <p className="text-stone-400 mt-1">{t.trackPayments}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <p className="text-stone-400 text-sm">{t.totalRevenue}</p>
          <p className="text-3xl font-semibold text-stone-900 dark:text-white mt-1">
            ₨{totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <p className="text-stone-400 text-sm">{t.paid}</p>
          <p className="text-3xl font-semibold text-green-600 dark:text-green-400 mt-1">
            ₨{totalReceived.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <p className="text-stone-400 text-sm">{t.pendingPayments}</p>
          <p className="text-3xl font-semibold text-orange-400 mt-1">
            ₨{totalPending.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['All', 'Paid', 'Unpaid'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
              ${filter === f
                ? 'bg-amber-500 text-stone-950'
                : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-stone-800 shadow-sm dark:shadow-none'
              }`}>
            {f === 'All' ? t.all : f === 'Paid' ? t.paidLabel : t.unpaid}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl mb-8 shadow-sm dark:shadow-none overflow-hidden">
        <div className="hidden md:grid grid-cols-6 px-6 py-3 border-b border-stone-200 dark:border-stone-800 text-stone-500 text-sm font-medium">
          <span>{t.customer}</span>
          <span>{t.item}</span>
          <span>{t.total}</span>
          <span>{t.paid}</span>
          <span>{t.balance}</span>
          <span>{t.action}</span>
        </div>

        {loading ? (
          <SkeletonRow theme={theme} count={5} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t.noOrdersFound}
            subtitle={t.trackPayments}
            theme={theme}
          />
        ) : (
          paginatedOrders.map(order => {
            const balance = order.total_price - order.advance_paid
            const isPaid = balance <= 0
            return (
              <div key={order.id}
                className="grid grid-cols-2 md:grid-cols-6 px-6 py-4 border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors items-center last:border-0 gap-y-2">
                <span className="text-stone-900 dark:text-white font-medium">
                  {order.customers?.name}
                </span>
                <span className="text-stone-600 dark:text-stone-300 text-sm">{t.garments[order.item_name] || order.item_name}</span>
                <span className="text-stone-600 dark:text-stone-300">₨{(order.total_price || 0).toLocaleString()}</span>
                <span className="text-green-400">₨{(order.advance_paid || 0).toLocaleString()}</span>
                <span className={isPaid ? 'text-green-400 font-semibold' : 'text-orange-400 font-semibold'}>
                  {isPaid ? `✓ ${t.paidLabel}` : `₨${balance.toLocaleString()}`}
                </span>

                <div className="flex gap-2">
                  {!isPaid && (
                    <button
                      onClick={() => { setPaymentOrder(order); setPaymentAmount('') }}
                      className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors">
                      <Plus size={12} />
                      {t.paid}
                    </button>
                  )}
                  <button
                    onClick={() => printReceipt(order)}
                    className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors">
                    <Printer size={12} />
                    {t.print}
                  </button>
                </div>
              </div>
            )
          })
        )}

        {!loading && filtered.length > PAGE_SIZE && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} theme={theme} />
        )}
      </div>

      {/* ── Record Payment Modal ── */}
      {paymentOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-stone-900 dark:text-white text-lg">{t.recordPayment}</h3>
              <button onClick={() => setPaymentOrder(null)}>
                <X size={20} className="text-stone-400 hover:text-white" />
              </button>
            </div>

            <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-stone-400 text-sm">{t.customer}</span>
                <span className="text-stone-900 dark:text-white font-medium text-sm">{paymentOrder.customers?.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-stone-400 text-sm">{t.item}</span>
                <span className="text-stone-900 dark:text-white text-sm">{t.garments[paymentOrder.item_name] || paymentOrder.item_name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-stone-400 text-sm">{t.totalAmount}</span>
                <span className="text-stone-900 dark:text-white text-sm">₨{(paymentOrder.total_price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-stone-400 text-sm">{t.alreadyPaid}</span>
                <span className="text-green-400 text-sm font-medium">₨{(paymentOrder.advance_paid || 0).toLocaleString()}</span>
              </div>
              <div className="border-t border-stone-200 dark:border-stone-700 mt-2 pt-2 flex justify-between">
                <span className="text-stone-600 dark:text-stone-300 font-semibold text-sm">{t.remainingBalance}</span>
                <span className="text-orange-400 font-semibold">
                  ₨{((paymentOrder.total_price || 0) - (paymentOrder.advance_paid || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-stone-400 text-sm mb-1 block">{t.amountReceived} (₨)</label>
              <input type="number"
                placeholder={`Max: ₨${(paymentOrder.total_price || 0) - (paymentOrder.advance_paid || 0)}`}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 text-lg font-semibold" />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setPaymentAmount(String((paymentOrder.total_price || 0) - (paymentOrder.advance_paid || 0)))}
                  className="flex-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 text-xs font-semibold py-1.5 rounded-lg transition-colors">
                  {t.fullBalance}
                </button>
                <button
                  onClick={() => setPaymentAmount(String(Math.round(((paymentOrder.total_price || 0) - (paymentOrder.advance_paid || 0)) / 2)))}
                  className="flex-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 text-xs font-semibold py-1.5 rounded-lg transition-colors">
                  {t.half}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={recordPayment} disabled={savingPayment}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {savingPayment ? t.saving : `✓ ${t.confirmPayment}`}
              </button>
              <button onClick={() => setPaymentOrder(null)}
                className="flex-1 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-semibold py-3 rounded-xl transition-colors">
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-2xl p-6 w-full max-w-sm">
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3 text-center">Language / भाषा</p>
              <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl gap-1">
                {[
                  { id: 'en', name: 'EN' },
                  { id: 'hi', name: 'HI' },
                  { id: 'mr', name: 'MR' }
                ].map(l => (
                  <button
                    key={l.id}
                    onClick={() => setReceiptLang(l.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${receiptLang === l.id ? 'bg-white dark:bg-stone-700 text-amber-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#fdfdfd', borderRadius: '16px', border: '1px solid #eee' }}>
              <div style={{ maxWidth: '280px', margin: '0 auto', fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#000' }}>
                <div style={{ textAlign: 'center' }}>
                  {profile?.logo_url && (
                    <img src={profile.logo_url} alt="Logo"
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', margin: '0 auto 6px', display: 'block' }} />
                  )}
                  <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0', letterSpacing: '-0.5px' }}>
                    ✂️ {profile?.brand_name || 'Vastra Track'}
                  </h2>
                  <p style={{ fontSize: '10px', color: '#666', margin: '2px 0', textTransform: 'uppercase', fontWeight: '600' }}>{translations[receiptLang]?.professionalServices}</p>
                </div>

                <div style={{ borderTop: '2px dashed #eee', margin: '12px 0' }} />
                <div style={{ fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                    <span>{translations[receiptLang]?.receiptNo}</span>
                    <span style={{ fontWeight: 'bold', background: '#000', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>{selectedOrder.order_number || selectedOrder.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                    <span>{translations[receiptLang]?.date}:</span>
                    <span>{new Date().toLocaleDateString('en-IN')}</span>
                  </div>
                </div>

                <div style={{ borderTop: '2px dashed #eee', margin: '12px 0' }} />
                <div style={{ fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                    <span>{translations[receiptLang]?.customer}:</span>
                    <span style={{ fontWeight: 'bold' }}>{selectedOrder.customers?.name}</span>
                  </div>
                </div>

                <div style={{ borderTop: '2px dashed #eee', margin: '12px 0' }} />
                <div style={{ fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                    <span style={{ fontWeight: 'bold' }}>{translations[receiptLang]?.garments[selectedOrder.item_name] || selectedOrder.item_name}</span>
                    <span style={{ fontWeight: 'bold' }}>₨{(selectedOrder.total_price || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ borderTop: '2px dashed #eee', margin: '12px 0' }} />
                <div style={{ fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0', fontSize: '14px' }}>
                    <span style={{ fontWeight: 'bold' }}>{translations[receiptLang]?.balanceDue}:</span>
                    <span style={{
                      color: (selectedOrder.total_price || 0) - (selectedOrder.advance_paid || 0) <= 0 ? '#16a34a' : '#dc2626',
                      fontWeight: '800'
                    }}>
                      ₨{((selectedOrder.total_price || 0) - (selectedOrder.advance_paid || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {qrDataUrl && (
                  <div style={{ textAlign: 'center', margin: '15px 0' }}>
                    <img src={qrDataUrl} alt="QR Code" style={{ width: '70px', height: '70px', margin: '0 auto', display: 'block' }} />
                    <p style={{ fontSize: '8px', color: '#999', marginTop: '4px' }}>{translations[receiptLang]?.scanQr}</p>
                  </div>
                )}
                
                <p style={{ textAlign: 'center', fontSize: '10px', margin: '15px 0 0', color: '#666', fontWeight: '600' }}>{translations[receiptLang]?.thanksMessage} 🙏</p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={doPrint}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold py-2.5 rounded-xl transition-colors">
                <Printer size={16} />
                {t.print}
              </button>
              <button onClick={() => { setSelectedOrder(null); setQrDataUrl('') }}
                className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-900 font-semibold py-2.5 rounded-xl transition-colors">
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}