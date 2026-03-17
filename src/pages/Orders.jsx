import { ShoppingBag, Plus, Search, X, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'

const statusColors = {
  'Pending':   'bg-orange-400/10 text-orange-400',
  'Cutting':   'bg-blue-400/10 text-blue-400',
  'Stitching': 'bg-purple-400/10 text-purple-400',
  'Ready':     'bg-green-400/10 text-green-400',
  'Delivered': 'bg-stone-400/10 text-stone-400',
}

const clothTypes = [
  'Shalwar Kameez', 'Trouser', 'Shirt', 'Full Suit',
  'Sherwani', 'Waistcoat', 'Coat / Blazer',
  'Frock / Dress', 'Lehenga', 'Kurti', 'Dupatta', 'Other'
]

const measurementFields = [
  { key: 'neck',     label: 'Neck' },
  { key: 'shoulder', label: 'Shoulder' },
  { key: 'chest',    label: 'Chest' },
  { key: 'sleeve',   label: 'Sleeve' },
  { key: 'length',   label: 'Length' },
  { key: 'waist',    label: 'Waist' },
  { key: 'hips',     label: 'Hips' },
  { key: 'inseam',   label: 'Inseam' },
  { key: 'thigh',    label: 'Thigh' },
]

const emptyForm = {
  customer_id: '', item_name: '', fabric: '',
  total_price: '', advance_paid: '', status: 'Pending',
  due_date: '', notes: '', garment_type: '',
  neck: '', shoulder: '', chest: '', sleeve: '',
  length: '', waist: '', hips: '', inseam: '', thigh: '',
}

const emptyCustomerForm = {
  name: '', phone: '', address: ''
}

export default function Orders({ theme, lang }) {
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [orderMeasurements, setOrderMeasurements] = useState({})

  // Quick add customer
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm)
  const [savingCustomer, setSavingCustomer] = useState(false)

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
  }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      let { data, error } = await supabase
        .from('orders')
        .select('*, customers(name, phone), workers(name)')
        .order('created_at', { ascending: false })

      // Fallback for missing workers relationship
      if (error && error.message.includes('workers')) {
        const fallback = await supabase
          .from('orders')
          .select('*, customers(name, phone)')
          .order('created_at', { ascending: false })
        data = fallback.data
        error = fallback.error
      }

      if (error) console.error(error)
      else setOrders(data || [])
    } catch (err) {
      console.error("Unexpected fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone')
      .order('name')
    setCustomers(data || [])
  }

  async function quickAddCustomer() {
    if (!customerForm.name) return alert('Please enter customer name')
    if (!customerForm.phone) return alert('Please enter phone number')
    setSavingCustomer(true)
    const user = (await supabase.auth.getUser()).data.user
    const { data, error } = await supabase
      .from('customers')
      .insert([{ ...customerForm, owner_id: user.id }])
      .select()
    if (error) {
      alert('Error: ' + error.message)
    } else {
      await fetchCustomers()
      setForm(prev => ({ ...prev, customer_id: data[0].id }))
      setCustomerForm(emptyCustomerForm)
      setShowAddCustomer(false)
    }
    setSavingCustomer(false)
  }

  async function fetchMeasurements(orderId) {
    const { data } = await supabase
      .from('measurements')
      .select('*')
      .eq('order_id', orderId)
      .single()
    setOrderMeasurements(prev => ({ ...prev, [orderId]: data || null }))
  }

  async function toggleOrder(orderId) {
    if (expandedOrder === orderId) {
      setExpandedOrder(null)
    } else {
      setExpandedOrder(orderId)
      if (!orderMeasurements[orderId]) {
        await fetchMeasurements(orderId)
      }
    }
  }

  async function saveOrder() {
    if (!form.customer_id) return alert('Please select a customer')
    if (!form.item_name) return alert('Please select an item')
    setSaving(true)

    const user = (await supabase.auth.getUser()).data.user
const { data: orderData, error } = await supabase
  .from('orders')
  .insert([{
    owner_id: user.id,
    customer_id: form.customer_id,
        item_name: form.item_name,
        fabric: form.fabric,
        total_price: parseFloat(form.total_price) || 0,
        advance_paid: parseFloat(form.advance_paid) || 0,
        status: form.status,
        due_date: form.due_date || null,
        notes: form.notes,
      }])
      .select()

    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }

    const hasMeasurements = measurementFields.some(f => form[f.key])
    if (hasMeasurements && orderData?.[0]) {
      const measureData = {
        order_id: orderData[0].id,
        customer_id: form.customer_id,
        garment_type: form.garment_type,
        notes: form.notes,
        owner_id: user.id,
      }
      measurementFields.forEach(f => {
        measureData[f.key] = parseFloat(form[f.key]) || null
      })
      await supabase.from('measurements').insert([measureData])
    }

    // Send SMS for new order
    if (orderData?.[0]) {
      const { data: customer } = await supabase
        .from('customers')
        .select('name, phone')
        .eq('id', form.customer_id)
        .single()

      if (customer?.phone) {
        try {
          await supabase.functions.invoke('send-sms', {
            body: {
              phone: customer.phone,
              customerName: customer.name,
              status: 'Pending',
              itemName: form.item_name,
            }
          })
        } catch (err) {
          console.log('SMS failed:', err)
        }
      }
    }

setForm(emptyForm)
setShowForm(false)
fetchOrders()
setSaving(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id)
  
    const { data: order } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('id', id)
      .single()
  
    if (order?.customers?.phone) {
      try {
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            phone: order.customers.phone,
            customerName: order.customers.name,
            status: status,
            itemName: order.item_name,
          }
        })
        console.log('SMS result:', data, error)
      } catch (err) {
        console.log('SMS error:', err)
      }
    }
  
    fetchOrders()
  }

  async function deleteOrder(id) {
    if (!confirm('Delete this order?')) return
    await supabase.from('orders').delete().eq('id', id)
    fetchOrders()
  }

  const filtered = orders.filter(o => {
    const itemName = o.item_name || ''
    const customerName = o.customers?.name || ''
    
    const matchSearch =
      itemName.toLowerCase().includes(search.toLowerCase()) ||
      customerName.toLowerCase().includes(search.toLowerCase())
      
    const matchFilter = filter === 'All' || o.status === filter
    return matchSearch && matchFilter
  })

  const inputClass = "w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 text-sm"

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-stone-900 dark:text-white">{t.orders}</h2>
          <p className="text-stone-400 mt-1">{orders.length} total orders</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setShowAddCustomer(false) }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-2.5 rounded-xl transition-colors">
          <Plus size={18} />
          New Order
        </button>
      </div>

      {/* ── NEW ORDER FORM ── */}
      {showForm && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-amber-500/30 rounded-2xl p-6 mb-6 shadow-sm dark:shadow-none transition-colors">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-stone-900 dark:text-white text-lg">{t.newOrder}</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={20} className="text-stone-400 hover:text-white" />
            </button>
          </div>

          {/* ORDER DETAILS */}
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">
            {t.orderDetails || 'Order Details'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">

            {/* CUSTOMER FIELD + QUICK ADD */}
            <div className="col-span-2">
              <label className="text-stone-400 text-sm mb-1 block">{t.customer} *</label>
              <div className="flex gap-2">
                <select value={form.customer_id}
                  onChange={e => setForm({...form, customer_id: e.target.value})}
                  className={inputClass}>
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `— ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddCustomer(!showAddCustomer)}
                  title="Add new customer"
                  className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 font-bold px-3 py-2 rounded-xl transition-colors whitespace-nowrap text-sm">
                  <UserPlus size={16} />
                  New
                </button>
              </div>

              {/* QUICK ADD CUSTOMER PANEL */}
              {showAddCustomer && (
                <div className="mt-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-3">
                    ➕ Add New Customer
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-stone-400 text-xs mb-1 block">Name *</label>
                      <input type="text" placeholder="Ahmed Khan"
                        value={customerForm.name}
                        onChange={e => setCustomerForm({...customerForm, name: e.target.value})}
                        className={inputClass} />
                    </div>
                    <div>
                      <label className="text-stone-400 text-xs mb-1 block">Phone *</label>
                      <input type="text" placeholder="0300-1234567"
                        value={customerForm.phone}
                        onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                        className={inputClass} />
                    </div>
                    <div>
                      <label className="text-stone-400 text-xs mb-1 block">Address</label>
                      <input type="text" placeholder="City, Area..."
                        value={customerForm.address}
                        onChange={e => setCustomerForm({...customerForm, address: e.target.value})}
                        className={inputClass} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={quickAddCustomer} disabled={savingCustomer}
                      className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">
                      {savingCustomer ? 'Saving...' : '✓ Save Customer'}
                    </button>
                    <button onClick={() => setShowAddCustomer(false)}
                      className="bg-stone-800 hover:bg-stone-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ITEM NAME — DROPDOWN */}
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.item} *</label>
              <select value={form.item_name}
                onChange={e => setForm({...form, item_name: e.target.value})}
                className={inputClass}>
                <option value="">{t.item}...</option>
                {clothTypes.map(c => (
                  <option key={c} value={c}>{t.garments[c] || c}</option>
                ))}
              </select>
            </div>

            {/* FABRIC */}
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.fabric}</label>
              <input type="text" placeholder="Lawn, Silk, Cotton..."
                value={form.fabric}
                onChange={e => setForm({...form, fabric: e.target.value})}
                className={inputClass} />
            </div>

            {/* STATUS */}
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.status}</label>
              <select value={form.status}
                onChange={e => setForm({...form, status: e.target.value})}
                className={inputClass}>
                {['Pending','Cutting','Stitching','Ready','Delivered'].map(s => (
                  <option key={s} value={s}>{t[s.toLowerCase()] || s}</option>
                ))}
              </select>
            </div>

            {/* TOTAL PRICE */}
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.total} (₨)</label>
              <input type="number" placeholder="2500"
                value={form.total_price}
                onChange={e => setForm({...form, total_price: e.target.value})}
                className={inputClass} />
            </div>

            {/* ADVANCE PAID */}
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.paid} (₨)</label>
              <input type="number" placeholder="1000"
                value={form.advance_paid}
                onChange={e => setForm({...form, advance_paid: e.target.value})}
                className={inputClass} />
            </div>

            {/* DUE DATE */}
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.dueDate}</label>
              <input type="date" value={form.due_date}
                onChange={e => setForm({...form, due_date: e.target.value})}
                className={inputClass} />
            </div>

            {/* NOTES */}
            <div className="col-span-2">
              <label className="text-stone-400 text-sm mb-1 block">{t.notes}</label>
              <input type="text" placeholder="Special instructions..."
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                className={inputClass} />
            </div>
          </div>

          {/* MEASUREMENTS */}
          <div className="border border-amber-500/20 rounded-2xl p-5 bg-amber-500/5 mb-5 mt-4">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
              📏 {t.measurements.garmentType} ({t.measurements.inches})
            </p>
            <div className="mb-4">
              <label className="text-stone-400 text-sm mb-1 block">{t.measurements.garmentType}</label>
              <select value={form.garment_type}
                onChange={e => setForm({...form, garment_type: e.target.value})}
                className={inputClass}>
                <option value="">{t.measurements.garmentType}...</option>
                {clothTypes.map(c => (
                  <option key={c} value={c}>{t.garments[c] || c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {measurementFields.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-stone-500 text-xs mb-1 block">
                    {t.measurements[key] || label} ({t.measurements.inches})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="0"
                    value={form[key]}
                    onChange={e => setForm({...form, [key]: e.target.value})}
                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={saveOrder} disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold px-6 py-2.5 rounded-xl transition-colors">
              {saving ? '...' : `✓ ${t.save} ${t.orders}`}
            </button>
            <button onClick={() => setShowForm(false)}
              className="bg-stone-800 hover:bg-stone-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['All','Pending','Cutting','Stitching','Ready','Delivered'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors
              ${filter === s
                ? 'bg-amber-500 text-stone-950'
                : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-stone-800 shadow-sm dark:shadow-none'
              }`}>
            {s === 'All' ? 'All' : t[s.toLowerCase()] || s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
        <input type="text" placeholder={t.search}
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 shadow-sm dark:shadow-none" />
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="hidden md:grid grid-cols-7 px-6 py-3 border-b border-stone-800 text-stone-500 text-xs font-semibold uppercase tracking-wider">
          <span>{t.customer}</span>
          <span>{t.item}</span>
          <span>{t.total}</span>
          <span>{t.balance}</span>
          <span>{t.workers}</span>
          <span>{t.status}</span>
          <span>{t.action}</span>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-stone-500">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag size={40} className="text-stone-700 mx-auto mb-3" />
            <p className="text-stone-500">No orders found.</p>
          </div>
        ) : (
          filtered.map(order => (
            <div key={order.id}>
              <div className="grid grid-cols-2 md:grid-cols-7 px-6 py-4 border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors items-center gap-y-2">
                <div>
                  <p className="text-stone-900 dark:text-white font-semibold text-sm">{order.customers?.name}</p>
                  {order.customers?.phone && (
                    <p className="text-stone-500 text-xs">{order.customers.phone}</p>
                  )}
                </div>
                <span className="text-stone-300 text-sm">{t.garments[order.item_name] || order.item_name}</span>
                <span className="text-stone-300 text-sm">₨{order.total_price}</span>
                <span className="text-orange-400 font-semibold text-sm">
                  ₨{order.total_price - order.advance_paid}
                </span>
                <span className="text-stone-400 text-sm">{order.workers?.name || '—'}</span>
                <select value={order.status}
                  onChange={e => updateStatus(order.id, e.target.value)}
                  className={`text-xs font-bold px-2 py-1 rounded-lg border-0 cursor-pointer w-fit ${statusColors[order.status]}`}>
                  {['Pending','Cutting','Stitching','Ready','Delivered'].map(s => (
                    <option key={s} value={s}>{t[s.toLowerCase()] || s}</option>
                  ))}
                </select>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => toggleOrder(order.id)}
                    title="View Measurements"
                    className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors">
                    📏 {expandedOrder === order.id
                      ? <ChevronUp size={12} />
                      : <ChevronDown size={12} />}
                  </button>
                  <button onClick={() => deleteOrder(order.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors">
                    Delete
                  </button>
                </div>
              </div>

              {/* Measurements Panel */}
              {expandedOrder === order.id && (
                <div className="px-6 py-5 bg-stone-50 dark:bg-stone-800/30 border-b border-stone-100 dark:border-stone-800">
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
                    📏 {t.measurements.garmentType} ({t.measurements.inches})
                  </p>
                  {orderMeasurements[order.id] ? (
                    <div>
                      {orderMeasurements[order.id].garment_type && (
                        <p className="text-stone-300 text-sm mb-3">
                          <span className="text-stone-500">{t.measurements.garmentType}: </span>
                          <span className="font-semibold">
                            {t.garments[orderMeasurements[order.id].garment_type] || orderMeasurements[order.id].garment_type}
                          </span>
                        </p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {measurementFields.map(({ key, label }) => {
                          const val = orderMeasurements[order.id][key]
                          if (!val) return null
                          return (
                            <div key={key} className={`rounded-xl p-3 text-center border ${theme === 'dark' ? 'bg-stone-900 border-stone-700' : 'bg-white border-stone-200'}`}>
                              <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-stone-500' : 'text-stone-600'}`}>{t.measurements[key] || label}</p>
                              <p className={`font-bold text-xl ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>{val}"</p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-stone-600' : 'text-stone-500'}`}>{t.measurements.inches}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-stone-600 text-sm italic">
                      No measurements recorded for this order.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}