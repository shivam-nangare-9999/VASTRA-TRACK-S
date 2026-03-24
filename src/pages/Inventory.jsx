import { useState, useEffect } from 'react'
import { Package, Plus, Search, Edit3, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'
import { SkeletonRow } from '../components/SkeletonLoader'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../components/Toast'

export default function Inventory({ theme, lang }) {
  const t = translations[lang] || translations['en']
  const showToast = useToast()
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({ id: null, item_name: '', quantity: '', unit: 'Meters' })
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    fetchInventory()
  }, [])

  async function fetchInventory() {
    setLoading(true)
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('item_name', { ascending: true })
    
    if (error) {
      console.error(error)
      // If table doesn't exist yet, just mock empty array to not break UI before SQL is run
      setItems([])
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  async function saveItem() {
    if (!form.item_name || form.quantity === '') return showToast('Fill required fields', 'warning')
    setSaving(true)

    const payload = {
      item_name: form.item_name,
      quantity: Number(form.quantity),
      unit: form.unit
    }

    let error;
    if (form.id) {
      const res = await supabase.from('inventory').update(payload).eq('id', form.id)
      error = res.error
    } else {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        payload.owner_id = userData.user.id
      }
      const res = await supabase.from('inventory').insert([payload])
      error = res.error
    }

    if (error) {
      showToast('Error saving item. Make sure SQL setup is complete.', 'error')
    } else {
      showToast('Item saved ✓', 'success')
      resetForm()
      fetchInventory()
    }
    setSaving(false)
  }

  function startEdit(item) {
    setForm(item)
    setShowForm(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const { error } = await supabase.from('inventory').delete().eq('id', deleteTarget)
    if (!error) {
      showToast('Item deleted ✓', 'success')
      fetchInventory()
    } else {
      showToast('Error deleting item', 'error')
    }
    setDeleteTarget(null)
  }

  function resetForm() {
    setForm({ id: null, item_name: '', quantity: '', unit: 'Meters' })
    setShowForm(false)
  }

  const filtered = items.filter(i => 
    i.item_name.toLowerCase().includes(search.toLowerCase())
  )

  const inputClass = "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-end flex-wrap gap-5 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-1.5 h-8 bg-amber-500 rounded-full" />
            <h2 className="font-syne text-3xl font-bold text-stone-900 dark:text-white tracking-tight">{t.inventory || 'Inventory'}</h2>
          </div>
          <p className="text-stone-500 text-sm ml-3.5 flex items-center gap-2">
            <Package size={14} className="text-amber-500" />
            {t.stock || 'Manage Stock & Materials'}
          </p>
        </div>

        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="group relative flex items-center justify-center gap-2.5 bg-stone-900 dark:bg-white hover:bg-black dark:hover:bg-stone-100 text-white dark:text-stone-900 font-semibold px-6 py-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/10 dark:shadow-white/10 active:scale-95 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-amber-500/0 -translate-x-full group-hover:animate-shimmer" />
            <Plus size={18} className="transition-transform group-hover:rotate-90" />
            {t.addStock || 'Add Stock'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-[#0d0d1a] border border-stone-200 dark:border-stone-800 rounded-[32px] p-6 md:p-8 mb-8 shadow-2xl animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center pb-5 border-b border-stone-100 dark:border-stone-800 mb-6">
            <h3 className="font-syne font-semibold text-xl text-stone-900 dark:text-white">
              {form.id ? 'Edit Item' : t.addStock || 'Add Item'}
            </h3>
            <button onClick={resetForm} className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.item || 'Item Name'} *</label>
              <input type="text" placeholder="e.g. Silk Fabric, Buttons"
                value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})}
                className={inputClass} autoFocus />
            </div>
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.quantity || 'Quantity'} *</label>
              <input type="number" placeholder="0"
                value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})}
                className={inputClass} />
            </div>
            <div>
              <label className="text-stone-400 text-sm mb-1 block">{t.unit || 'Unit'} *</label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className={inputClass}>
                <option value="Meters">{t.meters || 'Meters'}</option>
                <option value="Pieces">{t.pieces || 'Pieces'}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-stone-100 dark:border-stone-800">
            <button onClick={saveItem} disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold px-8 py-3.5 rounded-2xl transition-all hover:shadow-lg hover:shadow-amber-500/20 active:scale-95">
              {saving ? t.saving : `✓ ${t.saveItem || 'Save Item'}`}
            </button>
            <button onClick={resetForm}
              className="bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-semibold px-8 py-3.5 rounded-2xl transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
        <input type="text" placeholder={t.search}
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white placeholder-stone-500 rounded-2xl pl-11 pr-4 py-4 focus:outline-none focus:border-amber-500 shadow-sm dark:shadow-none transition-colors" />
      </div>

      <div className="bg-white dark:bg-[#0d0d1a] border border-stone-200 dark:border-stone-800 rounded-[32px] shadow-sm dark:shadow-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-8 py-4 border-b border-stone-100 dark:border-stone-800/50 text-stone-500 text-xs font-bold tracking-wider uppercase">
          <span>{t.item || 'Item Name'}</span>
          <span>{t.quantity || 'Quantity'}</span>
          <span>{t.unit || 'Unit'}</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <SkeletonRow theme={theme} count={4} cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t.noInventoryFound || 'No inventory'}
            subtitle={t.noInventorySubtitle || 'Add items to track stock'}
            actionLabel={`+ ${t.addStock || 'Add Stock'}`}
            onAction={() => setShowForm(true)}
            theme={theme}
          />
        ) : (
          filtered.map(item => (
            <div key={item.id} className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 px-8 py-5 border-b border-stone-50 dark:border-stone-800/50 items-center transition-colors hover:bg-stone-50 dark:hover:bg-white/[0.02] last:border-0">
              <span className="text-stone-900 dark:text-white font-semibold">{item.item_name}</span>
              <span className={`font-medium ${item.quantity <= 5 ? 'text-red-500' : 'text-stone-600 dark:text-stone-400'}`}>
                {item.quantity}
              </span>
              <span className="text-stone-500 text-sm hidden md:block">{t[item.unit.toLowerCase()] || item.unit}</span>
              <div className="flex gap-2 justify-end col-span-2 md:col-span-1 mt-2 md:mt-0">
                <button onClick={() => startEdit(item)}
                  className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-semibold px-3 py-1.5 rounded-xl transition-colors text-xs">
                  <Edit3 size={14} /> Edit
                </button>
                <button onClick={() => setDeleteTarget(item.id)}
                  className="flex items-center gap-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-semibold px-3 py-1.5 rounded-xl transition-colors text-xs">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Item"
          message="Are you sure you want to delete this item from inventory? This cannot be undone."
          confirmLabel={t.delete || "Delete"}
          cancelLabel={t.cancel || "Cancel"}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          theme={theme}
        />
      )}
    </div>
  )
}
