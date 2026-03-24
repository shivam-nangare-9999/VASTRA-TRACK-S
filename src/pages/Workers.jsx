import { UserCog, Plus, X, ShoppingBag, ClipboardList, Edit3, Printer } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'
import { SkeletonWorkerCard } from '../components/SkeletonLoader'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../components/Toast'

export default function Workers({ theme, lang, profile }) {
  const t = translations[lang]
  const showToast = useToast()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', specialty: '' })
  const [orders, setOrders] = useState([])
  const [assigningWorker, setAssigningWorker] = useState(null)
  const [viewingWorker, setViewingWorker] = useState(null)
  const [printingOrder, setPrintingOrder] = useState(null)
  const [editingWorkerId, setEditingWorkerId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    fetchWorkers()
    fetchOrders()
  }, [])

  async function fetchWorkers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    else setWorkers(data)
    setLoading(false)
  }

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, customers(name)')
      .neq('status', 'Delivered')
    setOrders(data || [])
  }

  function startEdit(worker) {
    setEditingWorkerId(worker.id)
    setForm({ name: worker.name, phone: worker.phone || '', specialty: worker.specialty || '' })
    setShowForm(true)
  }

  function resetForm() {
    setForm({ name: '', phone: '', specialty: '' })
    setShowForm(false)
    setEditingWorkerId(null)
  }

  async function saveWorker() {
    if (!form.name) return showToast(t.name + ' is required', 'warning')
    setSaving(true)

    const workerData = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      specialty: form.specialty.trim() || 'All',
    }

    if (editingWorkerId) {
      const { error } = await supabase.from('workers').update(workerData).eq('id', editingWorkerId)
      if (error) showToast(error.message, 'error')
      else {
        showToast(t.edit + ' ✓', 'success')
        resetForm()
        fetchWorkers()
      }
    } else {
      const user = (await supabase.auth.getUser()).data.user
      const { error } = await supabase.from('workers').insert([{ ...workerData, owner_id: user.id }])
      if (error) showToast(error.message, 'error')
      else {
        showToast(t.newWorker + ' ✓', 'success')
        resetForm()
        fetchWorkers()
      }
    }
    setSaving(false)
  }

  async function confirmDeleteWorker() {
    if (!deleteTarget) return
    await supabase.from('workers').delete().eq('id', deleteTarget)
    setDeleteTarget(null)
    showToast(t.delete + ' ✓', 'success')
    fetchWorkers()
  }

  async function assignOrder(orderId, workerId) {
    const { error } = await supabase
      .from('orders')
      .update({ worker_id: workerId })
      .eq('id', orderId)

    if (error) showToast(error.message, 'error')
    else {
      showToast(t.assign + ' ✓', 'success')
      await fetchOrders()
      setAssigningWorker(null)
    }
  }

  async function unassignOrder(orderId) {
    const { error } = await supabase
      .from('orders')
      .update({ worker_id: null })
      .eq('id', orderId)

    if (error) showToast(error.message, 'error')
    else {
      showToast('Unassigned ✓', 'success')
      await fetchOrders()
    }
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
          <title>${pt.jobCard} — ${order.id.slice(0, 8)}</title>
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
          <div class="row"><span>${pt.jobCardNo}</span><span class="bold card-no">${order.id.slice(0, 8).toUpperCase()}</span></div>
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

  const inputClass = "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-stone-900 dark:text-white">{t.workers}</h2>
          <p className="text-stone-400 mt-1">{workers.length} {t.staffMembers}</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-5 py-2.5 rounded-xl transition-colors">
          <Plus size={18} />
          {t.newWorker}
        </button>
      </div>

      {/* Add/Edit Worker Form */}
      {showForm && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-amber-500/30 rounded-2xl p-6 mb-6 shadow-sm dark:shadow-none transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-stone-900 dark:text-white text-lg">
              {editingWorkerId ? t.edit + ' ' + t.workers : t.newWorker}
            </h3>
            <button onClick={resetForm}>
              <X size={20} className="text-stone-400 hover:text-white" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.specialty}</label>
              <input type="text" placeholder="Stitching, Cutting..."
                value={form.specialty}
                onChange={e => setForm({...form, specialty: e.target.value})}
                className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={saveWorker} disabled={saving}
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

      {/* Workers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonWorkerCard theme={theme} count={3} />
        </div>
      ) : workers.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm dark:shadow-none">
          <EmptyState
            icon={UserCog}
            title={t.noWorkersFound}
            subtitle={t.noWorkersSubtitle}
            actionLabel={`+ ${t.newWorker}`}
            onAction={() => setShowForm(true)}
            theme={theme}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map(worker => {
            const assignedOrders = orders.filter(o => o.worker_id === worker.id)
            return (
              <div key={worker.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 hover:border-amber-500/50 transition-all shadow-sm dark:shadow-none">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-amber-500/10 w-12 h-12 rounded-xl flex items-center justify-center">
                    <UserCog size={22} className="text-amber-500" />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => startEdit(worker)}
                      className="text-blue-400 hover:text-blue-300 transition-colors p-1">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(worker.id)}
                      className="text-stone-600 hover:text-red-400 transition-colors p-1">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-stone-900 dark:text-white text-lg">{worker.name}</h3>
                {worker.phone && <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">{worker.phone}</p>}
                {worker.specialty && (
                  <span className="inline-block mt-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs px-3 py-1 rounded-full">
                    {worker.specialty}
                  </span>
                )}

                <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-stone-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <ClipboardList size={12} /> {t.assignedTasks}
                    </span>
                    <span className="bg-amber-500 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {assignedOrders.length}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setViewingWorker(worker)}
                      className="flex-1 py-2.5 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs font-semibold rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex items-center justify-center gap-1.5">
                      <ClipboardList size={14} /> View
                    </button>
                    <button
                      onClick={() => setAssigningWorker(worker)}
                      className="flex-1 py-2.5 border border-amber-500/30 text-amber-500 text-xs font-semibold rounded-xl hover:bg-amber-500 hover:text-stone-950 transition-all flex items-center justify-center gap-1.5">
                      <Plus size={14} /> Assign
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Assign Order Modal */}
      {assigningWorker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-white text-lg">{t.assignOrders}</h3>
                <p className="text-stone-500 text-xs font-semibold">To: {assigningWorker.name}</p>
              </div>
              <button onClick={() => setAssigningWorker(null)}>
                <X size={20} className="text-stone-400 hover:text-white" />
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto pr-1 space-y-3">
              {orders.filter(o => !o.worker_id).length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title={t.allAssigned}
                  subtitle={t.allAssignedSubtitle}
                  theme={theme}
                />
              ) : (
                orders.filter(o => !o.worker_id).map(order => (
                  <div key={order.id} className="flex justify-between items-center p-4 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-800 transition-colors group">
                    <div>
                      <p className="text-stone-900 dark:text-white font-semibold text-sm group-hover:text-amber-500 transition-colors">{order.customers?.name}</p>
                      <p className="text-stone-500 text-[11px] font-medium mt-0.5">{t.garments[order.item_name] || order.item_name} • {t[order.status.toLowerCase()] || order.status}</p>
                    </div>
                    <button
                      onClick={() => assignOrder(order.id, assigningWorker.id)}
                      className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold px-4 py-2 rounded-xl transition-transform active:scale-95 shadow-lg shadow-amber-500/10">
                      {t.assign}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Assigned Orders Modal */}
      {viewingWorker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-white text-lg">Assigned Orders</h3>
                <p className="text-stone-500 text-xs font-semibold">Worker: {viewingWorker.name}</p>
              </div>
              <button onClick={() => setViewingWorker(null)}>
                <X size={20} className="text-stone-400 hover:text-white" />
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto pr-1 space-y-3">
              {orders.filter(o => o.worker_id === viewingWorker.id).length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No assigned orders"
                  subtitle="This worker has no active orders assigned right now."
                  theme={theme}
                />
              ) : (
                orders.filter(o => o.worker_id === viewingWorker.id).map(order => (
                  <div key={order.id} className="flex justify-between items-center p-4 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-800 transition-colors group">
                    <div>
                      <p className="text-stone-900 dark:text-white font-semibold text-sm group-hover:text-amber-500 transition-colors">{order.customers?.name}</p>
                      <p className="text-stone-500 text-[11px] font-medium mt-0.5">{t.garments[order.item_name] || order.item_name} • {t[order.status.toLowerCase()] || order.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPrintingOrder(order)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => unassignOrder(order.id)}
                        className="text-stone-400 hover:text-red-500 text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title={t.confirmDelete}
          message={t.confirmDeleteWorker}
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          onConfirm={confirmDeleteWorker}
          onCancel={() => setDeleteTarget(null)}
          theme={theme}
        />
      )}
      {/* Language Selection Modal */}
      {printingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-left">
            <h3 className="text-xl font-semibold text-stone-900 dark:text-white mb-2 text-center">🖨️ {t.printJobCard}</h3>
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
                  className="flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 dark:border-stone-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all text-stone-900 dark:text-white font-semibold group">
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
              className="mt-6 w-full py-3 text-stone-500 font-semibold hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}