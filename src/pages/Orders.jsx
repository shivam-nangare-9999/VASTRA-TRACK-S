import { ShoppingBag, Plus, Search, X, ChevronDown, ChevronUp, UserPlus, Upload, Image as ImageIcon, Edit3, Download, Calendar, Printer } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'
import { SkeletonRow } from '../components/SkeletonLoader'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import Pagination, { usePagination } from '../components/Pagination'
import { useToast } from '../components/Toast'
import { exportToCSV, formatOrdersForExport } from '../lib/exportUtils'
import { openWhatsApp } from '../lib/whatsapp'
import { getFieldsForGarment, ALL_MEASUREMENT_FIELDS } from '../lib/measurements'
const measurementFields = ALL_MEASUREMENT_FIELDS

const statusColors = {
  'Pending':   'bg-orange-400/10 text-orange-400',
  'Ready':     'bg-green-400/10 text-green-400',
  'Delivered': 'bg-stone-400/10 text-stone-400',
}

const groupedClothTypes = {
  upper: ['Mens Shirt', 'Mens Kurta', 'Mens Sherwani', 'Mens Waistcoat', 'Mens Coat / Blazer', 'Mens Jacket'],
  lower: ['Mens Pant / Trouser', 'Mens Salwar', 'Mens Pajama', 'Mens Dhoti'],
  sets: ['Mens Full Suit', 'Mens Pathani Suit', 'Mens Safari Suit'],
  other: ['Other']
}

const allClothTypes = Object.values(groupedClothTypes).flat()

const emptyForm = {
  customer_id: '', item_name: '', fabric: '',
  total_price: '', advance_paid: '', status: 'Pending',
  due_date: '', notes: '', garment_type: '', worker_id: '',
  neck: '', shoulder: '', chest: '', sleeve: '',
  length: '', waist: '', hips: '', inseam: '', thigh: '',
}

const emptyCustomerForm = { name: '', phone: '', address: '' }

export default function Orders({ theme, lang, profile }) {
  const isCutter = profile?.role === 'cutter' || profile?.role === 'worker';
  const t = translations[lang] || translations['en']
  const showToast = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [orderMeasurements, setOrderMeasurements] = useState({})

  // Edit mode
  const [editingOrderId, setEditingOrderId] = useState(null)

  // Quick add customer
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm)
  const [savingCustomer, setSavingCustomer] = useState(false)

  // Photo upload
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Auto-fill flag
  const [autoFilled, setAutoFilled] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Date range filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [printingOrder, setPrintingOrder] = useState(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
    fetchWorkers()
  }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      let { data, error } = await supabase
        .from('orders')
        .select('*, customers(name, phone), workers(name)')
        .order('created_at', { ascending: false })

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

  async function fetchWorkers() {
    const { data } = await supabase
      .from('workers')
      .select('id, name, specialty')
      .order('name')
    setWorkers(data || [])
  }

  // Auto-fill measurements when customer is selected
  async function onCustomerSelect(customerId) {
    setForm(prev => ({ ...prev, customer_id: customerId }))
    setAutoFilled(false)

    if (!customerId) return

    const { data } = await supabase
      .from('measurements')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const m = data[0]
      const updates = {}
      measurementFields.forEach(f => {
        if (m[f.key]) updates[f.key] = String(m[f.key])
      })
      if (m.garment_type) updates.garment_type = m.garment_type
      setForm(prev => ({ ...prev, ...updates }))
      setAutoFilled(true)
    }
  }

  async function quickAddCustomer() {
    if (!customerForm.name) return showToast(t.name + ' is required', 'warning')
    if (!customerForm.phone) return showToast(t.phone + ' is required', 'warning')
    setSavingCustomer(true)
    const user = (await supabase.auth.getUser()).data.user
    const { data, error } = await supabase
      .from('customers')
      .insert([{ ...customerForm, owner_id: user.id }])
      .select()
    if (error) {
      showToast(error.message, 'error')
    } else {
      await fetchCustomers()
      setForm(prev => ({ ...prev, customer_id: data[0].id }))
      setCustomerForm(emptyCustomerForm)
      setShowAddCustomer(false)
      showToast(t.saveCustomer + ' ✓', 'success')
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

  function handleImageSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview('')
  }

  // Open form in edit mode
  function startEditOrder(order) {
    setEditingOrderId(order.id)
    setForm({
      customer_id: order.customer_id || '',
      item_name: order.item_name || '',
      fabric: order.fabric || '',
      total_price: order.total_price || '',
      advance_paid: order.advance_paid || '',
      status: order.status || 'Pending',
      due_date: order.due_date || '',
      notes: order.notes || '',
      garment_type: '',
      worker_id: order.worker_id || '',
      neck: '', shoulder: '', chest: '', sleeve: '',
      length: '', waist: '', hips: '', inseam: '', thigh: '',
    })
    // Load existing measurements
    if (orderMeasurements[order.id]) {
      const m = orderMeasurements[order.id]
      const updates = {}
      measurementFields.forEach(f => {
        if (m[f.key]) updates[f.key] = String(m[f.key])
      })
      if (m.garment_type) updates.garment_type = m.garment_type
      setForm(prev => ({ ...prev, ...updates }))
    }
    if (order.image_url) setImagePreview(order.image_url)
    setShowForm(true)
    setAutoFilled(false)
  }

  async function saveOrder() {
    if (!form.customer_id) return showToast(t.selectCustomer, 'warning')
    if (!form.item_name) return showToast(t.selectItem, 'warning')
    setSaving(true)

    const user = (await supabase.auth.getUser()).data.user

    // Upload image if new file selected
    let image_url = null
    if (imageFile) {
      setUploadingImage(true)
      try {
        const fileExt = imageFile.name.split('.').pop()
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('order-images')
          .upload(filePath, imageFile, { upsert: true })

        if (uploadError) {
          console.log('Image upload error:', uploadError)
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('order-images')
            .getPublicUrl(filePath)
          image_url = publicUrl
        }
      } catch (err) {
        console.log('Image upload failed:', err)
      }
      setUploadingImage(false)
    }

    const orderPayload = {
      owner_id: user.id,
      customer_id: form.customer_id,
      item_name: form.item_name,
      fabric: form.fabric,
      total_price: parseFloat(form.total_price) || 0,
      advance_paid: parseFloat(form.advance_paid) || 0,
      status: form.status,
      due_date: form.due_date || null,
      notes: form.notes,
      worker_id: form.worker_id || null,
    }
    if (image_url) orderPayload.image_url = image_url

    let orderData, error

    if (editingOrderId) {
      // UPDATE existing order
      const result = await supabase
        .from('orders')
        .update(orderPayload)
        .eq('id', editingOrderId)
        .select()
      orderData = result.data
      error = result.error
    } else {
      // INSERT new order
      const result = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
      orderData = result.data
      error = result.error
    }

    if (error) {
      showToast(error.message, 'error')
      setSaving(false)
      return
    }

    // Save measurements
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

      if (editingOrderId) {
        // Check if measurements exist
        const { data: existing } = await supabase
          .from('measurements')
          .select('id')
          .eq('order_id', editingOrderId)
          .single()
        if (existing) {
          await supabase.from('measurements').update(measureData).eq('id', existing.id)
        } else {
          await supabase.from('measurements').insert([measureData])
        }
      } else {
        await supabase.from('measurements').insert([measureData])
      }
    }

    // Send WhatsApp for new order only
    if (!editingOrderId && orderData?.[0]) {
      const { data: customer } = await supabase
        .from('customers')
        .select('name, phone')
        .eq('id', form.customer_id)
        .single()

      if (customer?.phone) {
        const msg = `Dear ${customer.name}, your order for ${form.item_name} has been received and is pending. Thank you! - Vastra Track`;
        openWhatsApp(customer.phone, msg);
      }
    }

    showToast(editingOrderId ? t.editOrder + ' ✓' : t.newOrder + ' ✓', 'success')
    resetForm()
    fetchOrders()
  }

  function resetForm() {
    setForm(emptyForm)
    setShowForm(false)
    setImageFile(null)
    setImagePreview('')
    setAutoFilled(false)
    setEditingOrderId(null)
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
      const statusText = t[status.toLowerCase()] || status;
      let msg = '';
      if (status === 'Ready') {
        msg = `Dear ${order.customers.name}, great news! Your ${order.item_name} is ready for pickup. Please visit us! - Vastra Track`;
      } else if (status === 'Delivered') {
        msg = `Dear ${order.customers.name}, your ${order.item_name} has been delivered. Thank you for choosing us! - Vastra Track`;
      } else {
        msg = `Dear ${order.customers.name}, your ${order.item_name} status has been updated to: ${statusText} - Vastra Track`;
      }
      openWhatsApp(order.customers.phone, msg);
    }

    showToast(`${t.status}: ${t[status.toLowerCase()] || status}`, 'success')
    fetchOrders()
  }

  async function confirmDeleteOrder() {
    if (!deleteTarget) return
    await supabase.from('orders').delete().eq('id', deleteTarget)
    setDeleteTarget(null)
    showToast(t.deleteOrder + ' ✓', 'success')
    fetchOrders()
  }

  function handleExport() {
    const data = formatOrdersForExport(filtered)
    exportToCSV(data, `vastra-orders-${new Date().toISOString().split('T')[0]}.csv`)
    showToast(t.exportCSV + ' ✓', 'success')
  }

  async function printJobCard(order, targetLang = lang) {
    const pt = translations[targetLang] || t
    const { data: measurements } = await supabase
      .from('measurements')
      .select('*')
      .eq('order_id', order.id)
      .single()

    const win = window.open('', '', 'width=450,height=800')
    const m = measurements || {}
    
    // Build measurements list
    const mList = Object.entries(m)
      .filter(([key, val]) => val && !['id', 'created_at', 'order_id', 'customer_id', 'owner_id', 'garment_type', 'notes'].includes(key))
      .map(([key, val]) => `<div class="row"><span>${pt.measurements[key] || key}:</span><span>${val} ${pt.measurements.inches}</span></div>`)
      .join('')

    win.document.write(`
      <html>
        <head>
          <title>${pt.jobCard} — ${order.order_number || order.id.slice(0, 8)}</title>
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
            .bold { font-weight: 700; }
            .extra-bold { font-weight: 800; }
            .dashed { border-top: 2px dashed #e5e7eb; margin: 12px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .brand { font-size: 18px; font-weight: 800; margin-bottom: 2px; color: #000; letter-spacing: -0.5px; }
            .job-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #666; letter-spacing: 1px; }
            .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 15px; margin-bottom: 8px; color: #999; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
            .card-no { background: #000; color: #fff; padding: 2px 6px; borderRadius: 4px; font-size: 11px; }
            @media print { body { max-width: 100%; padding: 10px; } .dashed { border-top: 2px dashed #000; } }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 class="brand">✂️ ${profile?.brand_name || 'Vastra Track'}</h2>
            <p class="job-title">${pt.jobCard}</p>
          </div>
          <div class="dashed"></div>
          <div class="row"><span>${pt.jobCardNo}</span><span class="bold card-no">${order.order_number || order.id.slice(0, 8).toUpperCase()}</span></div>
          <div class="row"><span>${pt.date}:</span><span>${new Date().toLocaleDateString('en-IN')}</span></div>
          <div class="row"><span>${pt.dueDate}:</span><span class="bold">${order.due_date ? new Date(order.due_date).toLocaleDateString('en-IN') : '—'}</span></div>
          <div class="dashed"></div>
          <div class="row"><span>${pt.customer}:</span><span class="bold">${order.customers?.name}</span></div>
          <div class="row"><span>${pt.item}:</span><span class="bold">${pt.garments[order.item_name] || order.item_name}</span></div>
          ${order.fabric ? `<div class="row"><span>${pt.fabric}:</span><span>${order.fabric}</span></div>` : ''}
          <div class="dashed"></div>
          <p class="section-title">${pt.measurementsSummary}</p>
          ${mList || `<p class="center" style="font-size: 11px; margin-top: 10px; color: #999;">${pt.noMeasurements}</p>`}
          ${order.notes ? `<p class="section-title">${pt.notes}</p><p style="font-size: 11px; background: #f9fafb; padding: 8px; border-radius: 6px;">${order.notes}</p>` : ''}
          <div class="dashed" style="margin-top: 25px;"></div>
          <p class="center" style="font-size: 10px; color: #999; font-weight: 600;">${pt.thanksMessage}</p>
          <p class="center" style="font-size: 9px; color: #ccc; margin-top: 4px;">${pt.poweredBy}</p>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close(); }, 800)
    setPrintingOrder(null)
  }

  // Filtering
  const filtered = orders.filter(o => {
    const itemName = o.item_name || ''
    const customerName = o.customers?.name || ''
    const matchSearch =
      (o.order_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
      itemName.toLowerCase().includes(search.toLowerCase()) ||
      customerName.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || o.status === filter

    // Date range filter
    let matchDate = true
    if (dateFrom) {
      const orderDate = o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : ''
      if (orderDate < dateFrom) matchDate = false
    }
    if (dateTo) {
      const orderDate = o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : ''
      if (orderDate > dateTo) matchDate = false
    }

    return matchSearch && matchFilter && matchDate
  })

  // Pagination
  const { totalPages, getPageItems } = usePagination(filtered, PAGE_SIZE)
  const paginatedOrders = getPageItems(currentPage)

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [search, filter, dateFrom, dateTo])

  const inputClass = "w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 text-sm"

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900 dark:text-white">{t.orders}</h2>
          <p className="text-stone-400 mt-1">{orders.length} {t.totalOrdersLabel}</p>
        </div>
        <div className="flex gap-2">
          {!isCutter && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-amber-500 hover:text-amber-500 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Download size={16} />
              {t.exportCSV}
            </button>
          )}
          {!isCutter && (
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); setShowAddCustomer(false) }}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={18} />
              {t.newOrder}
            </button>
          )}
        </div>
      </div>

      {/* ── ORDER FORM (Create / Edit) ── */}
      {showForm && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-amber-500/30 rounded-2xl p-6 mb-6 shadow-sm dark:shadow-none transition-colors">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-stone-900 dark:text-white text-lg">
              {editingOrderId ? t.editOrder : t.newOrder}
            </h3>
            <button onClick={resetForm}>
              <X size={20} className="text-stone-400 hover:text-white" />
            </button>
          </div>

          {/* ORDER DETAILS */}
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
            {t.orderDetails}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">

            {/* CUSTOMER FIELD + QUICK ADD */}
            <div className="col-span-2">
              <label className="text-stone-400 text-sm mb-1 block">{t.customer} *</label>
              <div className="flex gap-2">
                <select value={form.customer_id}
                  onChange={e => onCustomerSelect(e.target.value)}
                  className={inputClass}>
                  <option value="">{t.selectCustomer}</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `— ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddCustomer(!showAddCustomer)}
                  title={t.addNewCustomer}
                  className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 font-semibold px-3 py-2 rounded-xl transition-colors whitespace-nowrap text-sm">
                  <UserPlus size={16} />
                  {t.new}
                </button>
              </div>

              {/* Auto-fill badge */}
              {autoFilled && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-green-400/10 border border-green-400/20 rounded-full px-3 py-1 text-[11px] font-semibold text-green-400">
                  ✓ {t.measurementsAutoFilled}
                </div>
              )}

              {/* QUICK ADD CUSTOMER PANEL */}
              {showAddCustomer && (
                <div className="mt-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-3">
                    ➕ {t.addNewCustomer}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-stone-400 text-xs mb-1 block">{t.name} *</label>
                      <input type="text" placeholder="Ahmed Khan"
                        value={customerForm.name}
                        onChange={e => setCustomerForm({...customerForm, name: e.target.value})}
                        className={inputClass} />
                    </div>
                    <div>
                      <label className="text-stone-400 text-xs mb-1 block">{t.phone} *</label>
                      <input type="text" placeholder="0300-1234567"
                        value={customerForm.phone}
                        onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                        className={inputClass} />
                    </div>
                    <div>
                      <label className="text-stone-400 text-xs mb-1 block">{t.address}</label>
                      <input type="text" placeholder="City, Area..."
                        value={customerForm.address}
                        onChange={e => setCustomerForm({...customerForm, address: e.target.value})}
                        className={inputClass} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={quickAddCustomer} disabled={savingCustomer}
                      className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                      {savingCustomer ? t.saving : `✓ ${t.saveCustomer}`}
                    </button>
                    <button onClick={() => setShowAddCustomer(false)}
                      className="bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                      {t.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ITEM NAME */}
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.item} *</label>
              <select value={form.item_name}
                onChange={e => setForm({...form, item_name: e.target.value})}
                className={inputClass}>
                <option value="">{t.selectItem}</option>
                <optgroup label={t.upperGarments}>
                  {groupedClothTypes.upper.map(c => (
                    <option key={c} value={c}>{t.garments[c] || c}</option>
                  ))}
                </optgroup>
                <optgroup label={t.lowerGarments}>
                  {groupedClothTypes.lower.map(c => (
                    <option key={c} value={c}>{t.garments[c] || c}</option>
                  ))}
                </optgroup>
                <optgroup label="SETS / SUITS">
                  {groupedClothTypes.sets.map(c => (
                    <option key={c} value={c}>{t.garments[c] || c}</option>
                  ))}
                </optgroup>
                <optgroup label="OTHER">
                  {groupedClothTypes.other.map(c => (
                    <option key={c} value={c}>{t.garments[c] || c}</option>
                  ))}
                </optgroup>
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

            {/* WORKER ASSIGNMENT */}
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.assignWorker}</label>
              <select value={form.worker_id}
                onChange={e => setForm({...form, worker_id: e.target.value})}
                className={inputClass}>
                <option value="">{t.selectWorker}</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.specialty ? `— ${w.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* STATUS */}
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.status}</label>
              <select value={form.status}
                onChange={e => setForm({...form, status: e.target.value})}
                className={inputClass}>
                {['Pending','Ready','Delivered'].map(s => (
                  <option key={s} value={s}>{t[s.toLowerCase()] || s}</option>
                ))}
              </select>
            </div>

            {/* TOTAL PRICE & ADVANCE PAID (Hidden for Cutters) */}
            {!isCutter && (
              <>
                <div>
                  <label className="text-stone-400 text-sm mb-1 block">{t.total} (₨)</label>
                  <input type="number" placeholder="2500"
                    value={form.total_price}
                    onChange={e => setForm({...form, total_price: e.target.value})}
                    className={inputClass} />
                </div>
                <div>
                  <label className="text-stone-400 text-sm mb-1 block">{t.paid} (₨)</label>
                  <input type="number" placeholder="1000"
                    value={form.advance_paid}
                    onChange={e => setForm({...form, advance_paid: e.target.value})}
                    className={inputClass} />
                </div>
              </>
            )}

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

            {/* IMAGE UPLOAD */}
            <div className="col-span-2">
              <label className="text-stone-400 text-sm mb-1 block">📷 {t.fabricDesignPhoto}</label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-xl object-cover border-2 border-stone-200 dark:border-amber-500/30" />
                    <button onClick={clearImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-semibold cursor-pointer border-0">×</button>
                  </div>
                ) : (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center justify-center cursor-pointer gap-1 hover:border-amber-500 transition-colors bg-stone-50 dark:bg-stone-800/50">
                    <Upload size={18} className="text-stone-400" />
                    <span className="text-[9px] text-stone-500 font-semibold">Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>
                )}
                <p className="text-[11px] text-stone-500 leading-snug">
                  {t.uploadPhotoHint}<br/>
                  <span className="text-[10px] text-stone-400">{t.photoFormats}</span>
                </p>
              </div>
            </div>
          </div>

          {/* MEASUREMENTS */}
          <div className="border border-amber-500/20 rounded-2xl p-5 bg-amber-500/5 mb-5 mt-4">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">
              📏 {t.measurements.garmentType} ({t.measurements.inches})
            </p>
            <div className="mb-4">
              <label className="text-stone-400 text-sm mb-1 block">{t.measurements.garmentType}</label>
              <select value={form.garment_type}
                onChange={e => setForm({...form, garment_type: e.target.value})}
                className={inputClass}>
                <option value="">{t.measurements.garmentType}...</option>
                {allClothTypes.map(c => (
                  <option key={c} value={c}>{t.garments[c] || c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {getFieldsForGarment(form.garment_type || form.item_name).map(({ key, label }) => (
                <div key={key}>
                  <label className="text-stone-500 text-xs mb-1 block">
                    {t.measurements[key] || label} ({t.measurements.inches})
                  </label>
                  <input
                    type="number" step="0.5" placeholder="0"
                    value={form[key]}
                    onChange={e => setForm({...form, [key]: e.target.value})}
                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={saveOrder} disabled={saving || uploadingImage}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold px-6 py-2.5 rounded-xl transition-colors">
              {saving ? (uploadingImage ? `📷 ${t.uploading}` : t.saving) : `✓ ${t.save} ${t.orders}`}
            </button>
            <button onClick={resetForm}
              className="bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-bold px-6 py-2.5 rounded-xl transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['All','Pending','Ready','Delivered'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors
              ${filter === s
                ? 'bg-amber-500 text-stone-950'
                : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-stone-800 shadow-sm dark:shadow-none'
              }`}>
            {s === 'All' ? t.all : t[s.toLowerCase()] || s}
          </button>
        ))}
      </div>

      {/* Date Range & Search Row */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
          <input type="text" placeholder={t.search}
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 shadow-sm dark:shadow-none" />
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-stone-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white rounded-xl px-3 py-3 focus:outline-none focus:border-amber-500 text-sm" />
          <span className="text-stone-500 text-sm">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white rounded-xl px-3 py-3 focus:outline-none focus:border-amber-500 text-sm" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-stone-400 hover:text-red-400 text-xs font-bold transition-colors">
              {t.clearDates}
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className={`hidden md:grid ${isCutter ? 'grid-cols-7' : 'grid-cols-9'} px-6 py-3 border-b border-stone-200 dark:border-stone-800 text-stone-500 text-xs font-semibold uppercase tracking-wider`}>
          <span>ID</span>
          <span>{t.customer}</span>
          <span>{t.item}</span>
          {!isCutter && <span>{t.total}</span>}
          {!isCutter && <span>{t.balance}</span>}
          <span>{t.workers}</span>
          <span>{t.status}</span>
          <span>{t.dueDate}</span>
          <span>{t.action}</span>
        </div>

        {loading ? (
          <SkeletonRow theme={theme} count={5} cols={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={t.noOrdersFound}
            subtitle={t.noOrdersSubtitle}
            actionLabel={`+ ${t.newOrder}`}
            onAction={() => setShowForm(true)}
            theme={theme}
          />
        ) : (
          paginatedOrders.map(order => (
            <div key={order.id}>
              <div className={`grid grid-cols-2 ${isCutter ? 'md:grid-cols-7' : 'md:grid-cols-9'} px-6 py-4 border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors items-center gap-y-2`}>
                <span className="text-amber-500 font-mono text-xs font-bold">{order.order_number || order.id.slice(0, 8).toUpperCase()}</span>
                <div className="flex items-center gap-3">
                  {order.image_url ? (
                    <img src={order.image_url} alt="Garment"
                      className="w-10 h-10 rounded-lg object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      onClick={() => setLightboxImage(order.image_url)} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag size={16} className="text-stone-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-stone-900 dark:text-white font-semibold text-sm">{order.customers?.name}</p>
                    {order.customers?.phone && (
                      <p className="text-stone-500 text-xs">{order.customers.phone}</p>
                    )}
                  </div>
                </div>
                <span className="text-stone-600 dark:text-stone-300 text-sm">{t.garments[order.item_name] || order.item_name}</span>
                {!isCutter && <span className="text-stone-600 dark:text-stone-300 text-sm">₨{(order.total_price || 0).toLocaleString()}</span>}
                {!isCutter && (
                  <span className="text-orange-400 font-semibold text-sm">
                    ₨{((order.total_price || 0) - (order.advance_paid || 0)).toLocaleString()}
                  </span>
                )}
                <span className="text-stone-400 text-sm">{order.workers?.name || '—'}</span>
                <select value={order.status}
                  onChange={e => updateStatus(order.id, e.target.value)}
                  className={`text-xs font-bold px-2 py-1 rounded-lg border-0 cursor-pointer w-fit ${statusColors[order.status]}`}>
                  {['Pending','Ready','Delivered'].map(s => (
                    <option key={s} value={s}>{t[s.toLowerCase()] || s}</option>
                  ))}
                </select>
                <span className="text-stone-500 text-xs">
                  {order.due_date ? new Date(order.due_date).toLocaleDateString() : '—'}
                </span>
                <div className="flex gap-1.5 items-center flex-wrap">
                    <button
                      onClick={() => toggleOrder(order.id)}
                      title={t.measurements.garmentType}
                      className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors">
                      📏 {expandedOrder === order.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                      onClick={() => setPrintingOrder(order)}
                      title={t.printJobCard}
                      className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors">
                      <Printer size={12} />
                    </button>
                  {!isCutter && (
                    <>
                      <button
                        onClick={() => startEditOrder(order)}
                        title={t.edit}
                        className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => setDeleteTarget(order.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors">
                        {t.delete}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded Panel — Measurements + Image */}
              {expandedOrder === order.id && (
                <div className="px-6 py-5 bg-stone-50 dark:bg-stone-800/30 border-b border-stone-100 dark:border-stone-800">
                  {order.image_url && (
                    <div className="mb-4">
                      <p className="text-stone-500 text-[11px] font-bold uppercase tracking-wider mb-2">
                        📷 {t.referencePhoto}
                      </p>
                      <img src={order.image_url} alt="Order reference"
                        className="max-w-[200px] max-h-[200px] rounded-xl object-cover border-2 border-stone-200 dark:border-amber-500/20" />
                    </div>
                  )}

                  <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">
                    📏 {t.measurements.garmentType} ({t.measurements.inches})
                  </p>
                  {orderMeasurements[order.id] ? (
                    <div>
                      {orderMeasurements[order.id].garment_type && (
                        <p className="text-stone-600 dark:text-stone-300 text-sm mb-3">
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
                      {t.noMeasurements}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            theme={theme}
          />
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title={t.confirmDelete}
          message={t.confirmDeleteOrder}
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          onConfirm={confirmDeleteOrder}
          onCancel={() => setDeleteTarget(null)}
          theme={theme}
        />
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6 cursor-pointer backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors text-xl font-bold"
          >
            ✕
          </button>
          <img
            src={lightboxImage}
            alt="Garment full size"
            className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      {/* Language Selection Modal */}
      {printingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2 text-center">🖨️ {t.printJobCard}</h3>
            <p className="text-stone-500 text-sm mb-6 text-center">Select Job Card Language</p>
            
            <div className="grid gap-3">
              {[
                { id: 'en', name: 'English', icon: '🇺🇸' },
                { id: 'hi', name: 'हिंदी (Hindi)', icon: '🇮🇳' },
                { id: 'mr', name: 'मराठी (Marathi)', icon: '🇮🇳' }
              ].map(l => (
                <button
                  key={l.id}
                  onClick={() => printJobCard(printingOrder, l.id)}
                  className="flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 dark:border-stone-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all text-stone-900 dark:text-white font-bold group">
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{l.icon}</span>
                    {l.name}
                  </span>
                  <span className="text-stone-300 group-hover:text-amber-500 transition-colors">→</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setPrintingOrder(null)}
              className="mt-6 w-full py-3 text-stone-500 font-bold hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}