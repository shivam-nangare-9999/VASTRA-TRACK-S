import { Users, Plus, Search, X, History, Edit3, Download, ShoppingBag } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'
import { SkeletonRow } from '../components/SkeletonLoader'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import Pagination, { usePagination } from '../components/Pagination'
import { useToast } from '../components/Toast'
import { exportToCSV, formatCustomersForExport } from '../lib/exportUtils'
import { openWhatsApp, formatPhoneForWA } from '../lib/whatsapp'
import { getFieldsForGarment } from '../lib/measurements'

const statusColors = {
  'Pending':   { bg: 'rgba(251,146,60,0.1)', text: '#fb923c' },
  'Cutting':   { bg: 'rgba(96,165,250,0.1)', text: '#60a5fa' },
  'Stitching': { bg: 'rgba(167,139,250,0.1)', text: '#a78bfa' },
  'Ready':     { bg: 'rgba(74,222,128,0.1)', text: '#4ade80' },
  'Delivered': { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8' },
}

export default function Customers({ theme, lang, profile }) {
  const isCutter = profile?.role === 'cutter' || profile?.role === 'worker';
  const t = translations[lang] || translations['en']
  const showToast = useToast()
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)

  // Edit mode
  const [editingCustomerId, setEditingCustomerId] = useState(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Measurement history modal
  const [historyCustomer, setHistoryCustomer] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Customer order history modal
  const [orderHistoryCustomer, setOrderHistoryCustomer] = useState(null)
  const [customerOrders, setCustomerOrders] = useState([])
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false)

  // WhatsApp Marketing
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [showBulkSmsModal, setShowBulkSmsModal] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')
  const [campaignStarted, setCampaignStarted] = useState(false)
  const [sentCustomers, setSentCustomers] = useState([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    else setCustomers(data)
    setLoading(false)
  }

  function startEdit(customer) {
    setEditingCustomerId(customer.id)
    setForm({ name: customer.name, phone: customer.phone || '', address: customer.address || '' })
    setShowForm(true)
  }

  async function saveCustomer() {
    if (!form.name) return showToast(t.name + ' is required', 'warning')
    setSaving(true)

    if (editingCustomerId) {
      const { error } = await supabase
        .from('customers')
        .update(form)
        .eq('id', editingCustomerId)
      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast(t.editCustomer + ' ✓', 'success')
        resetForm()
        fetchCustomers()
      }
    } else {
      const user = (await supabase.auth.getUser()).data.user
      const { error } = await supabase.from('customers').insert([{ ...form, owner_id: user.id }])
      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast(t.addCustomer + ' ✓', 'success')
        resetForm()
        fetchCustomers()
      }
    }
    setSaving(false)
  }

  function resetForm() {
    setForm({ name: '', phone: '', address: '' })
    setShowForm(false)
    setEditingCustomerId(null)
  }

  async function confirmDeleteCustomer() {
    if (!deleteTarget) return
    await supabase.from('customers').delete().eq('id', deleteTarget)
    setDeleteTarget(null)
    showToast(t.delete + ' ✓', 'success')
    fetchCustomers()
  }

  async function openMeasurementHistory(customer) {
    setHistoryCustomer(customer)
    setHistoryLoading(true)
    setHistoryData([])
    const { data, error } = await supabase
      .from('measurements')
      .select('*, orders(item_name, created_at)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
    if (error) {
      const fallback = await supabase
        .from('measurements')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
      setHistoryData(fallback.data || [])
    } else {
      setHistoryData(data || [])
    }
    setHistoryLoading(false)
  }

  // Customer Order History
  async function openOrderHistory(customer) {
    setOrderHistoryCustomer(customer)
    setOrderHistoryLoading(true)
    setCustomerOrders([])
    const { data } = await supabase
      .from('orders')
      .select('*, workers(name)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
    setCustomerOrders(data || [])
    setOrderHistoryLoading(false)
  }

  function handleExport() {
    const data = formatCustomersForExport(filtered)
    exportToCSV(data, `vastra-customers-${new Date().toISOString().split('T')[0]}.csv`)
    showToast(t.exportCSV + ' ✓', 'success')
  }

  function toggleSelectAll() {
    if (selectedCustomers.length === filtered.length) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(filtered.map(c => c.id))
    }
  }

  function toggleSelectCustomer(id) {
    if (selectedCustomers.includes(id)) {
      setSelectedCustomers(selectedCustomers.filter(cId => cId !== id))
    } else {
      setSelectedCustomers([...selectedCustomers, id])
    }
  }

  function handleStartCampaign() {
    if (!bulkMessage) return showToast(t.writeMessageHint, 'warning')
    
    const targets = customers.filter(c => selectedCustomers.includes(c.id) && c.phone && formatPhoneForWA(c.phone))
    if (targets.length === 0) {
      return showToast(t.noPhoneNumbers, 'error')
    }
    
    setCampaignStarted(true)
  }

  function handleSendWhatsApp(customer) {
    const msg = bulkMessage.replace('{name}', customer.name)
    const success = openWhatsApp(customer.phone, msg)
    if (success && !sentCustomers.includes(customer.id)) {
      setSentCustomers([...sentCustomers, customer.id])
    }
  }

  function closeCampaignModal() {
    setShowBulkSmsModal(false)
    setCampaignStarted(false)
    setSentCustomers([])
    setBulkMessage('')
    setSelectedCustomers([])
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  )

  const { totalPages, getPageItems } = usePagination(filtered, PAGE_SIZE)
  const paginatedCustomers = getPageItems(currentPage)

  useEffect(() => { setCurrentPage(1) }, [search])

  const inputClass = "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900 dark:text-white">{t.customers}</h2>
          <p className="text-stone-400 mt-1">{customers.length} {t.totalCustomersLabel}</p>
        </div>
        <div className="flex gap-2">
          {!isCutter && (
            <button onClick={handleExport}
              className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-amber-500 hover:text-amber-500 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm">
              <Download size={16} />
              {t.exportCSV}
            </button>
          )}
          {!isCutter && (
            <button
              onClick={() => { resetForm(); setShowForm(!showForm) }}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Plus size={18} />
              {t.addCustomer}
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Customer Form */}
      {showForm && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-amber-500/30 rounded-2xl p-6 mb-6 shadow-sm dark:shadow-none transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-stone-900 dark:text-white text-lg">
              {editingCustomerId ? t.editCustomer : t.addCustomer}
            </h3>
            <button onClick={resetForm}>
              <X size={20} className="text-stone-400 hover:text-white" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.name} *</label>
              <input type="text" placeholder="Ahmed Khan"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className={inputClass} />
            </div>
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.phone}</label>
              <input type="text" placeholder="0300-1234567"
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="text-stone-400 text-sm mb-1 block">{t.address}</label>
              <input type="text" placeholder="House 123, Street 4, Lahore"
                value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
                className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={saveCustomer} disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold px-6 py-2.5 rounded-xl transition-colors">
              {saving ? t.saving : `✓ ${t.save}`}
            </button>
            <button onClick={resetForm}
              className="bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
        <input type="text" placeholder={t.search}
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 shadow-sm dark:shadow-none" />
      </div>

      {/* Bulk Action Bar */}
      {!isCutter && selectedCustomers.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-6 flex justify-between items-center animate-in slide-in-from-bottom-5">
          <div>
            <span className="bg-green-500 text-white font-bold px-2 py-0.5 rounded-full text-xs mr-2">{selectedCustomers.length}</span>
            <span className="text-green-600 dark:text-green-400 font-semibold">{t.selected}</span>
          </div>
          <button
            onClick={() => setShowBulkSmsModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm">
            {t.whatsappMarketing}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-stone-200 dark:border-stone-800 text-stone-500 text-sm font-medium items-center">
          {!isCutter ? (
            <input type="checkbox"
              checked={selectedCustomers.length === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500 cursor-pointer" />
          ) : <div />}
          <span>{t.name}</span>
          <span>{t.phone}</span>
          <span>{t.address}</span>
          <span>📏 {t.measurementHistory}</span>
          <span>📋 {t.orderHistory}</span>
          {!isCutter ? <span>{t.action}</span> : <div />}
        </div>

        {loading ? (
          <SkeletonRow theme={theme} count={5} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t.noCustomersFound}
            subtitle={t.noCustomersSubtitle}
            actionLabel={`+ ${t.addCustomer}`}
            onAction={() => setShowForm(true)}
            theme={theme}
          />
        ) : (
          paginatedCustomers.map(customer => (
            <div key={customer.id}
              className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_1fr_1fr_auto_auto_auto] gap-4 px-6 py-4 border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors items-center">
              {!isCutter ? (
                <input type="checkbox"
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={() => toggleSelectCustomer(customer.id)}
                  className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500 cursor-pointer col-span-2 md:col-span-1" />
              ) : <div className="hidden md:block w-4 h-4" />}
              <span className={`text-stone-900 dark:text-white font-medium flex-1 ${isCutter ? 'col-span-2 md:col-span-1' : ''}`}>{customer.name}</span>
              <span className="text-stone-400">{customer.phone || '—'}</span>
              <span className="text-stone-400 text-sm truncate">{customer.address || '—'}</span>
              <button
                onClick={() => openMeasurementHistory(customer)}
                className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors w-fit">
                <History size={13} />
                {t.measurements.garmentType}
              </button>
              <button
                onClick={() => openOrderHistory(customer)}
                className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors w-fit">
                <ShoppingBag size={13} />
                {t.orders}
              </button>
              {!isCutter ? (
                <div className="flex gap-2">
                  <button onClick={() => startEdit(customer)}
                    className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors">
                    <Edit3 size={12} /> {t.edit}
                  </button>
                  <button onClick={() => setDeleteTarget(customer.id)}
                    className="text-red-400 hover:text-red-300 text-sm font-medium w-fit transition-colors">
                    {t.delete}
                  </button>
                </div>
              ) : <div className="hidden md:block" />}
            </div>
          ))
        )}

        {!loading && filtered.length > PAGE_SIZE && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} theme={theme} />
        )}
      </div>

      {/* WhatsApp Marketing Modal */}
      {showBulkSmsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-white text-lg">{campaignStarted ? t.sendViaWhatsApp : t.composeMessage}</h3>
                <p className="text-stone-500 text-xs mt-1">{t.sendToSelected}: {selectedCustomers.length} {t.customers.toLowerCase()}</p>
              </div>
              <button onClick={closeCampaignModal}>
                <X size={20} className="text-stone-400 hover:text-white" />
              </button>
            </div>

            {!campaignStarted ? (
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="mb-4">
                  <textarea
                    value={bulkMessage}
                    onChange={e => setBulkMessage(e.target.value)}
                    placeholder={t.writeMessageHint}
                    rows={5}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 resize-none"
                  />
                  <p className="text-green-600 dark:text-green-500 text-xs mt-2 font-medium">{t.useNameTag}</p>
                </div>

                {bulkMessage && (
                  <div className="mb-6 bg-stone-100 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200 dark:border-stone-700/50">
                    <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-2">{t.messagePreview}</p>
                    <p className="text-stone-600 dark:text-stone-300 text-sm italic">
                      "{bulkMessage.replace('{name}', customers.find(c => c.id === selectedCustomers[0])?.name || 'Customer Name')}"
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button onClick={handleStartCampaign}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    📱 {t.startCampaign}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6">
                  {customers.filter(c => selectedCustomers.includes(c.id)).map(customer => {
                    const isSent = sentCustomers.includes(customer.id);
                    const canSend = customer.phone && formatPhoneForWA(customer.phone);
                    
                    return (
                      <div key={customer.id} className={`flex items-center justify-between p-3 rounded-xl border ${isSent ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20' : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700'}`}>
                        <div>
                          <p className="font-semibold text-stone-900 dark:text-white text-sm">{customer.name}</p>
                          <p className="text-stone-500 text-xs">{customer.phone || 'No phone'}</p>
                        </div>
                        {canSend ? (
                          <button
                            onClick={() => handleSendWhatsApp(customer)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              isSent 
                                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' 
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}>
                            {isSent ? `✓ ${t.sent}` : t.sendViaWhatsApp}
                          </button>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">Invalid</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 shrink-0">
                   <button onClick={closeCampaignModal}
                    className="w-full bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-semibold py-3 rounded-xl transition-colors">
                    {t.close}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title={t.confirmDelete}
          message={t.confirmDeleteCustomer}
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          onConfirm={confirmDeleteCustomer}
          onCancel={() => setDeleteTarget(null)}
          theme={theme}
        />
      )}

      {/* ── Measurement History Modal ── */}
      {historyCustomer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-[700px] max-h-[80vh] flex flex-col overflow-hidden rounded-3xl border ${theme === 'dark' ? 'bg-[#0d0d1a] border-stone-800' : 'bg-white border-stone-200'}`}>
            <div className={`flex justify-between items-center p-5 border-b ${theme === 'dark' ? 'border-stone-800' : 'border-stone-200'}`}>
              <div>
                <h3 className="font-semibold text-lg text-stone-900 dark:text-white">📏 {t.measurementHistory}</h3>
                <p className="text-stone-500 text-sm mt-0.5">{historyCustomer.name} — {historyCustomer.phone || t.phone}</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)}
                className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {historyLoading ? (
                <SkeletonRow theme={theme} count={3} cols={4} />
              ) : historyData.length === 0 ? (
                <EmptyState icon={History} title={t.noMeasurementsYet} subtitle={t.noMeasurementsSubtitle} theme={theme} />
              ) : (
                <div className="flex flex-col gap-3">
                  {historyData.map((m, idx) => (
                    <div key={m.id || idx} className={`rounded-2xl p-4 border ${theme === 'dark' ? 'bg-stone-800/30 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
                      <div className={`flex justify-between items-center mb-3 pb-2.5 border-b ${theme === 'dark' ? 'border-stone-700' : 'border-stone-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-500/10 text-amber-400 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                            {m.garment_type || m.orders?.item_name || 'General'}
                          </span>
                          {idx === 0 && (
                            <span className="bg-green-400/10 text-green-400 text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide">
                              {t.latest}
                            </span>
                          )}
                        </div>
                        <span className="text-stone-500 text-[11px] font-semibold">
                          {m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {getFieldsForGarment(m.garment_type || m.orders?.item_name || 'Other').map(({ key, label }) => {
                          const val = m[key]
                          if (!val) return null
                          return (
                            <div key={key} className={`text-center p-2 rounded-xl border ${theme === 'dark' ? 'bg-stone-900 border-stone-700' : 'bg-white border-stone-200'}`}>
                              <p className="text-stone-500 text-[9px] font-semibold uppercase mb-0.5">{t.measurements[key] || label}</p>
                              <p className={`font-semibold text-base ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>{val}"</p>
                            </div>
                          )
                        })}
                      </div>
                      {m.notes && <p className="text-stone-500 text-xs mt-2 italic">📝 {m.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Order History Modal ── */}
      {orderHistoryCustomer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-[800px] max-h-[80vh] flex flex-col overflow-hidden rounded-3xl border ${theme === 'dark' ? 'bg-[#0d0d1a] border-stone-800' : 'bg-white border-stone-200'}`}>
            <div className={`flex justify-between items-center p-5 border-b ${theme === 'dark' ? 'border-stone-800' : 'border-stone-200'}`}>
              <div>
                <h3 className="font-semibold text-lg text-stone-900 dark:text-white">📋 {t.customerOrders}</h3>
                <p className="text-stone-500 text-sm mt-0.5">{orderHistoryCustomer.name} — {orderHistoryCustomer.phone || t.phone}</p>
              </div>
              <button onClick={() => setOrderHistoryCustomer(null)}
                className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {orderHistoryLoading ? (
                <SkeletonRow theme={theme} count={5} cols={5} />
              ) : customerOrders.length === 0 ? (
                <EmptyState icon={ShoppingBag} title={t.noOrdersForCustomer} subtitle={t.noOrdersForCustomerSubtitle} theme={theme} />
              ) : (
                <>
                  <div className={`hidden md:grid ${isCutter ? 'grid-cols-3' : 'grid-cols-6'} px-6 py-2.5 text-[11px] font-semibold tracking-wider uppercase border-b ${theme === 'dark' ? 'border-stone-800 text-stone-500' : 'border-stone-200 text-stone-500'}`}>
                    <span>{t.item}</span>
                    {!isCutter && <span>{t.total}</span>}
                    {!isCutter && <span>{t.paid}</span>}
                    {!isCutter && <span>{t.balance}</span>}
                    <span>{t.workers}</span>
                    <span>{t.status}</span>
                  </div>
                  {customerOrders.map(order => {
                    const bal = (order.total_price || 0) - (order.advance_paid || 0)
                    const sc = statusColors[order.status] || statusColors.Pending
                    return (
                      <div key={order.id} className={`grid grid-cols-2 md:${isCutter ? 'grid-cols-3' : 'grid-cols-6'} px-6 py-3.5 border-b items-center gap-y-2 ${theme === 'dark' ? 'border-stone-800 hover:bg-stone-800/30' : 'border-stone-100 hover:bg-stone-50'} transition-colors`}>
                        <div>
                          <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>{t.garments[order.item_name] || order.item_name}</p>
                          {order.due_date && <p className="text-stone-500 text-[11px]">{t.dueDate}: {new Date(order.due_date).toLocaleDateString()}</p>}
                        </div>
                        {!isCutter && <span className={`text-sm ${theme === 'dark' ? 'text-stone-300' : 'text-stone-700'}`}>₨{(order.total_price || 0).toLocaleString()}</span>}
                        {!isCutter && <span className="text-green-400 text-sm">₨{(order.advance_paid || 0).toLocaleString()}</span>}
                        {!isCutter && (
                          <span className={`font-medium text-sm ${bal <= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                            {bal <= 0 ? `✓ ${t.paidLabel}` : `₨${bal.toLocaleString()}`}
                          </span>
                        )}
                        <span className="text-stone-400 text-sm">{order.workers?.name || '—'}</span>
                        <span style={{ background: sc.bg, color: sc.text, fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', display: 'inline-block', width: 'fit-content' }}>
                          {t[order.status.toLowerCase()] || order.status}
                        </span>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}