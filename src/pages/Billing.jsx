import { Receipt, Printer, Plus, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'

export default function Billing({ theme, lang, profile }) {
  const t = translations[lang]
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [paymentOrder, setPaymentOrder] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const receiptRef = useRef()

  useEffect(() => {
    fetchOrders()
  }, [])

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
    if (!amount || amount <= 0) return alert('Please enter a valid amount')

    const order = paymentOrder
    const balance = order.total_price - order.advance_paid

    if (amount > balance) {
      return alert(`Balance is only ₨${balance}. Cannot pay more than that.`)
    }

    setSavingPayment(true)
    const newAdvance = order.advance_paid + amount

    const { error } = await supabase
      .from('orders')
      .update({ advance_paid: newAdvance })
      .eq('id', order.id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setPaymentAmount('')
      setPaymentOrder(null)
      fetchOrders()
    }
    setSavingPayment(false)
  }

  function printReceipt(order) {
    // Update selected order with latest data before printing
    setSelectedOrder(order)
  }

  function doPrint() {
    const content = receiptRef.current.innerHTML
    const win = window.open('', '', 'width=400,height=700')
    win.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: monospace; padding: 24px; font-size: 14px; max-width: 320px; margin: 0 auto; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .dashed { border-top: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
            .green { color: green; }
            .red { color: red; font-weight: bold; }
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

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-black text-stone-900 dark:text-white">{t.billing}</h2>
        <p className="text-stone-400 mt-1">{t.trackPayments || 'Track payments and print receipts'}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <p className="text-stone-400 text-sm">{t.totalRevenue}</p>
          <p className="text-3xl font-black text-stone-900 dark:text-white mt-1">
            ₨{totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <p className="text-stone-400 text-sm">{t.paid}</p>
          <p className="text-3xl font-black text-green-600 dark:text-green-400 mt-1">
            ₨{totalReceived.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <p className="text-stone-400 text-sm">{t.pendingPayments}</p>
          <p className="text-3xl font-black text-orange-400 mt-1">
            ₨{totalPending.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['All', 'Paid', 'Unpaid'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors
              ${filter === f
                ? 'bg-amber-500 text-stone-950'
                : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-stone-800 shadow-sm dark:shadow-none'
              }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl mb-8 shadow-sm dark:shadow-none overflow-hidden">
        <div className="hidden md:grid grid-cols-6 px-6 py-3 border-b border-stone-800 text-stone-500 text-sm font-semibold">
          <span>{t.customer}</span>
          <span>{t.item}</span>
          <span>{t.total}</span>
          <span>{t.paid}</span>
          <span>{t.balance}</span>
          <span>{t.action}</span>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-stone-500">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Receipt size={40} className="text-stone-700 mx-auto mb-3" />
            <p className="text-stone-500">No orders found.</p>
          </div>
        ) : (
          filtered.map(order => {
            const balance = order.total_price - order.advance_paid
            const isPaid = balance <= 0
            return (
              <div key={order.id}
                className="grid grid-cols-2 md:grid-cols-6 px-6 py-4 border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors items-center last:border-0 gap-y-2">
                <span className="text-stone-900 dark:text-white font-semibold">
                  {order.customers?.name}
                </span>
                <span className="text-stone-300 text-sm">{t.garments[order.item_name] || order.item_name}</span>
                <span className="text-stone-300">₨{order.total_price}</span>
                <span className="text-green-400">₨{order.advance_paid}</span>
                <span className={isPaid
                  ? 'text-green-400 font-bold'
                  : 'text-orange-400 font-bold'}>
                  {isPaid ? '✓ Paid' : `₨${balance}`}
                </span>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* Add Payment Button — only show if balance remaining */}
                  {!isPaid && (
                    <button
                      onClick={() => {
                        setPaymentOrder(order)
                        setPaymentAmount('')
                      }}
                      className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors">
                      <Plus size={12} />
                      Pay
                    </button>
                  )}

                  {/* Print Receipt Button */}
                  <button
                    onClick={() => printReceipt(order)}
                    className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors">
                    <Printer size={12} />
                    Print
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Record Payment Modal ── */}
      {paymentOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 dark:text-white text-lg">Record Payment</h3>
              <button onClick={() => setPaymentOrder(null)}>
                <X size={20} className="text-stone-400 hover:text-white" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-stone-400 text-sm">Customer</span>
                <span className="text-stone-900 dark:text-white font-semibold text-sm">
                  {paymentOrder.customers?.name}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-stone-400 text-sm">Item</span>
                <span className="text-white text-sm">{t.garments[paymentOrder.item_name] || paymentOrder.item_name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-stone-400 text-sm">Total Price</span>
                <span className="text-white text-sm">₨{paymentOrder.total_price}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-stone-400 text-sm">Already Paid</span>
                <span className="text-green-400 text-sm font-semibold">
                  ₨{paymentOrder.advance_paid}
                </span>
              </div>
              <div className="border-t border-stone-700 mt-2 pt-2 flex justify-between">
                <span className="text-stone-300 font-bold text-sm">Remaining Balance</span>
                <span className="text-orange-400 font-black">
                  ₨{paymentOrder.total_price - paymentOrder.advance_paid}
                </span>
              </div>
            </div>

            {/* Payment Input */}
            <div className="mb-4">
              <label className="text-stone-400 text-sm mb-1 block">
                Amount Received (₨)
              </label>
              <input
                type="number"
                placeholder={`Max: ₨${paymentOrder.total_price - paymentOrder.advance_paid}`}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 text-lg font-bold"
              />
              {/* Quick fill buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setPaymentAmount(String(paymentOrder.total_price - paymentOrder.advance_paid))}
                  className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold py-1.5 rounded-lg transition-colors">
                  Full Balance
                </button>
                <button
                  onClick={() => setPaymentAmount(String(Math.round((paymentOrder.total_price - paymentOrder.advance_paid) / 2)))}
                  className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold py-1.5 rounded-lg transition-colors">
                  Half
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={recordPayment}
                disabled={savingPayment}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
                {savingPayment ? 'Saving...' : '✓ Confirm Payment'}
              </button>
              <button
                onClick={() => setPaymentOrder(null)}
                className="flex-1 bg-stone-800 hover:bg-stone-700 text-white font-bold py-3 rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-2xl p-6 w-full max-w-sm">
            <div ref={receiptRef}>
              <div style={{textAlign:'center'}}>
                <h2 style={{fontSize:'20px', fontWeight:'900', margin:'0'}}>
                  ✂️ Vastra Track
                </h2>
                <p style={{fontSize:'12px', margin:'2px 0'}}>
                  Professional Tailoring Services
                </p>
                <p style={{fontSize:'12px', margin:'2px 0'}}>
                  Phone: 0300-0000000
                </p>
              </div>

              <div style={{borderTop:'1px dashed #000', margin:'10px 0'}} />

              <div style={{fontSize:'13px'}}>
                <div style={{display:'flex', justifyContent:'space-between', margin:'3px 0'}}>
                  <span>Receipt #:</span>
                  <span style={{fontWeight:'bold'}}>
                    {selectedOrder.id.slice(0,8).toUpperCase()}
                  </span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', margin:'3px 0'}}>
                  <span>Date:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                {selectedOrder.due_date && (
                  <div style={{display:'flex', justifyContent:'space-between', margin:'3px 0'}}>
                    <span>Due Date:</span>
                    <span>{selectedOrder.due_date}</span>
                  </div>
                )}
              </div>

              <div style={{borderTop:'1px dashed #000', margin:'10px 0'}} />

              <div style={{fontSize:'13px'}}>
                <div style={{display:'flex', justifyContent:'space-between', margin:'3px 0'}}>
                  <span>Customer:</span>
                  <span style={{fontWeight:'bold'}}>
                    {selectedOrder.customers?.name}
                  </span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', margin:'3px 0'}}>
                  <span>Phone:</span>
                  <span>{selectedOrder.customers?.phone || '—'}</span>
                </div>
              </div>

              <div style={{borderTop:'1px dashed #000', margin:'10px 0'}} />

              <div style={{fontSize:'13px'}}>
                <div style={{display:'flex', justifyContent:'space-between', margin:'3px 0'}}>
                  <span>{selectedOrder.item_name}</span>
                  <span>₨{selectedOrder.total_price}</span>
                </div>
                {selectedOrder.fabric && (
                  <div style={{fontSize:'11px', color:'#666', margin:'2px 0'}}>
                    Fabric: {selectedOrder.fabric}
                  </div>
                )}
                {selectedOrder.notes && (
                  <div style={{fontSize:'11px', color:'#666', margin:'2px 0'}}>
                    Notes: {selectedOrder.notes}
                  </div>
                )}
              </div>

              <div style={{borderTop:'1px dashed #000', margin:'10px 0'}} />

              <div style={{fontSize:'13px'}}>
                <div style={{display:'flex', justifyContent:'space-between', margin:'4px 0'}}>
                  <span>Total Amount:</span>
                  <span style={{fontWeight:'bold'}}>₨{selectedOrder.total_price}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', margin:'4px 0'}}>
                  <span>Total Paid:</span>
                  <span style={{color:'green', fontWeight:'bold'}}>
                    ₨{selectedOrder.advance_paid}
                  </span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', margin:'4px 0', fontSize:'15px'}}>
                  <span style={{fontWeight:'bold'}}>Balance Due:</span>
                  <span style={{
                    color: selectedOrder.total_price - selectedOrder.advance_paid <= 0 ? 'green' : 'red',
                    fontWeight:'900'
                  }}>
                    {selectedOrder.total_price - selectedOrder.advance_paid <= 0
                      ? '✓ FULLY PAID'
                      : `₨${selectedOrder.total_price - selectedOrder.advance_paid}`
                    }
                  </span>
                </div>
              </div>

              <div style={{borderTop:'1px dashed #000', margin:'10px 0'}} />
              <p style={{textAlign:'center', fontSize:'12px', margin:'0'}}>
                Thank you for your business! 🙏
              </p>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={doPrint}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 rounded-xl transition-colors">
                <Printer size={16} />
                Print
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-900 font-bold py-2.5 rounded-xl transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}