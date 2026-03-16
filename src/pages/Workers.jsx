import { UserCog, Plus, X, ShoppingBag, ClipboardList } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'

export default function Workers({ theme, lang }) {
  const t = translations[lang]
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', specialty: '' })
  const [orders, setOrders] = useState([])
  const [assigningWorker, setAssigningWorker] = useState(null)

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

  async function saveWorker() {
    if (!form.name) return alert('Please enter worker name')
    setSaving(true)
    const user = (await supabase.auth.getUser()).data.user
const { error } = await supabase.from('workers').insert([{ ...form, owner_id: user.id }])
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setForm({ name: '', phone: '', specialty: '' })
      setShowForm(false)
      fetchWorkers()
    }
    setSaving(false)
  }

  async function deleteWorker(id) {
    if (!confirm('Delete this worker?')) return
    await supabase.from('workers').delete().eq('id', id)
    fetchWorkers()
  }

  async function assignOrder(orderId, workerId) {
    const { error } = await supabase
      .from('orders')
      .update({ worker_id: workerId })
      .eq('id', orderId)
    
    if (error) alert('Error assigning: ' + error.message)
    else {
      await fetchOrders()
      setAssigningWorker(null)
    }
  }

  const inputClass = "w-full bg-stone-800 border border-stone-700 text-white placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-stone-900 dark:text-white">{t.workers}</h2>
          <p className="text-stone-400 mt-1">{workers.length} staff members</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-2.5 rounded-xl transition-colors">
          <Plus size={18} />
          {t.newWorker}
        </button>
      </div>

      {/* Add Worker Form */}
      {showForm && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-amber-500/30 rounded-2xl p-6 mb-6 shadow-sm dark:shadow-none transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-stone-900 dark:text-white text-lg">{t.newWorker}</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={20} className="text-stone-400 hover:text-white" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.name} *</label>
              <input
                type="text"
                placeholder="Ahmed Khan"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.phone}</label>
              <input
                type="text"
                placeholder="0300-1234567"
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.specialty}</label>
              <input
                type="text"
                placeholder="Stitching, Cutting..."
                value={form.specialty}
                onChange={e => setForm({...form, specialty: e.target.value})}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveWorker}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold px-6 py-2.5 rounded-xl transition-colors">
              {saving ? '...' : t.save}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-stone-800 hover:bg-stone-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Workers Grid */}
      {loading ? (
        <div className="text-center py-16">
          <p className="text-stone-500">Loading...</p>
        </div>
      ) : workers.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-center py-16 shadow-sm dark:shadow-none">
          <UserCog size={40} className="text-stone-700 mx-auto mb-3" />
          <p className="text-stone-500">{t.workers} not found.</p>
          <p className="text-stone-600 text-sm mt-1">Click "{t.newWorker}" to get started</p>
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
                <button
                  onClick={() => deleteWorker(worker.id)}
                  className="text-stone-600 hover:text-red-400 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white text-lg">{worker.name}</h3>
              <p className="text-stone-400 text-sm mt-1">{worker.phone || '—'}</p>
              {worker.specialty && (
                <span className="inline-block mt-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs px-3 py-1 rounded-full">
                  {worker.specialty}
                </span>
              )}

              <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-stone-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <ClipboardList size={12} /> Assigned Tasks
                  </span>
                  <span className="bg-amber-500 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {assignedOrders.length}
                  </span>
                </div>
                
                <button 
                  onClick={() => setAssigningWorker(worker)}
                  className="w-full mt-2 py-2.5 border border-amber-500/30 text-amber-500 text-xs font-bold rounded-xl hover:bg-amber-500 hover:text-stone-950 transition-all flex items-center justify-center gap-1.5">
                  <Plus size={14} /> Assign {t.orders}
                </button>
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
                <h3 className="font-bold text-stone-900 dark:text-white text-lg">Assign {t.orders}</h3>
                <p className="text-stone-500 text-xs font-semibold">To: {assigningWorker.name}</p>
              </div>
              <button onClick={() => setAssigningWorker(null)}>
                <X size={20} className="text-stone-400 hover:text-white" />
              </button>
            </div>
            
            <div className="max-h-[350px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {orders.filter(o => !o.worker_id).length === 0 ? (
                <div className="text-center py-10 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800">
                  <ShoppingBag size={32} className="text-stone-700 mx-auto mb-2 opacity-20" />
                  <p className="text-stone-500 text-sm">No unassigned orders found.</p>
                </div>
              ) : (
                orders.filter(o => !o.worker_id).map(order => (
                  <div key={order.id} className="flex justify-between items-center p-4 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-800 transition-colors group">
                    <div>
                      <p className="text-stone-900 dark:text-white font-bold text-sm group-hover:text-amber-500 transition-colors">{order.customers?.name}</p>
                      <p className="text-stone-500 text-[11px] font-medium mt-0.5">{t.garments[order.item_name] || order.item_name} • {t[order.status.toLowerCase()] || order.status}</p>
                    </div>
                    <button 
                      onClick={() => assignOrder(order.id, assigningWorker.id)}
                      className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black px-4 py-2 rounded-xl transition-transform active:scale-95 shadow-lg shadow-amber-500/10"
                    >
                      {t.action}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}