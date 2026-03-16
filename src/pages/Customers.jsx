import { Users, Plus, Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'

export default function Customers({ theme, lang }) {
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)

  // Load customers from database
  useEffect(() => {
    fetchCustomers()
  }, [])

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

  async function saveCustomer() {
    if (!form.name) return alert('Please enter customer name')
    setSaving(true)
    const user = (await supabase.auth.getUser()).data.user
const { error } = await supabase.from('customers').insert([{ ...form, owner_id: user.id }])
    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      setForm({ name: '', phone: '', address: '' })
      setShowForm(false)
      fetchCustomers()
    }
    setSaving(false)
  }

  async function deleteCustomer(id) {
    if (!confirm('Delete this customer?')) return
    await supabase.from('customers').delete().eq('id', id)
    fetchCustomers()
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-stone-900 dark:text-white">{t.customers}</h2>
          <p className="text-stone-400 mt-1">
            {customers.length} total customers
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-2.5 rounded-xl transition-colors">
          <Plus size={18} />
          {t.addCustomer}
        </button>
      </div>

      {/* Add Customer Form */}
      {showForm && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-amber-500/30 rounded-2xl p-6 mb-6 shadow-sm dark:shadow-none transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-stone-900 dark:text-white text-lg">{t.addCustomer}</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={20} className="text-stone-400 hover:text-white" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-stone-400 text-sm mb-1 block">
                {t.name} *
              </label>
              <input
                type="text"
                placeholder="Ahmed Khan"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-stone-400 text-sm mb-1 block">
                {t.phone}
              </label>
              <input
                type="text"
                placeholder="0300-1234567"
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-stone-400 text-sm mb-1 block">
                {t.address}
              </label>
              <input
                type="text"
                placeholder="House 123, Street 4, Lahore"
                value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveCustomer}
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

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          placeholder={t.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white placeholder-stone-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 shadow-sm dark:shadow-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="hidden md:grid grid-cols-4 px-6 py-3 border-b border-stone-200 dark:border-stone-800 text-stone-500 text-sm font-semibold">
          <span>{t.name}</span>
          <span>{t.phone}</span>
          <span>{t.address}</span>
          <span>{t.action}</span>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-stone-500">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="text-stone-700 mx-auto mb-3" />
            <p className="text-stone-500">{t.customers} not found.</p>
            <p className="text-stone-600 text-sm mt-1">
              Click "{t.addCustomer}" to get started
            </p>
          </div>
        ) : (
          filtered.map(customer => (
            <div
              key={customer.id}
              className="grid grid-cols-2 md:grid-cols-4 px-6 py-4 border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors items-center">
              <span className="text-stone-900 dark:text-white font-semibold">{customer.name}</span>
              <span className="text-stone-400">{customer.phone || '—'}</span>
              <span className="text-stone-400">{customer.address || '—'}</span>
              <button
                onClick={() => deleteCustomer(customer.id)}
                className="text-red-400 hover:text-red-300 text-sm font-semibold w-fit transition-colors">
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}