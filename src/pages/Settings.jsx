import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'
import { User, Save, CheckCircle, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'

export default function Settings({ theme, lang, profile, onProfileUpdate }) {
  const t = translations[lang] || translations['en']
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [shopCode, setShopCode] = useState(null)

  const [form, setForm] = useState({
    brand_name: '',
    phone: '',
    logo_url: ''
  })

  useEffect(() => {
    if (profile) {
      setForm({
        brand_name: profile.brand_name || '',
        phone: profile.phone || '',
        logo_url: profile.logo_url || ''
      })
      fetchShopCode(profile.id)
    }
  }, [profile])

  async function fetchShopCode(ownerId) {
    const { data } = await supabase.from('shop_codes').select('code').eq('owner_id', ownerId).single()
    if (data) {
      setShopCode(data.code)
    } else {
      // Generate one
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      await supabase.from('shop_codes').insert({ owner_id: ownerId, code: newCode })
      setShopCode(newCode)
    }
  }

  async function uploadLogo(e) {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      
      // Safely get the user ID directly from auth to prevent null profile errors
      const { data: authData } = await supabase.auth.getUser()
      const userId = profile?.id || authData?.user?.id

      const filePath = `${userId}/logo-${Math.random()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      // Upsert Profile immediately for the logo
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId, 
          logo_url: publicUrl, 
          brand_name: form.brand_name, 
          phone: form.phone 
        })

      if (updateError) throw updateError

      setForm(prev => ({ ...prev, logo_url: publicUrl }))
      if (onProfileUpdate) onProfileUpdate()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

    } catch (error) {
      alert('Error uploading logo: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleUpdate() {
    setLoading(true)
    setSuccess(false)
    
    const { data: authData } = await supabase.auth.getUser()
    const userId = profile?.id || authData?.user?.id

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        brand_name: form.brand_name,
        phone: form.phone,
        logo_url: form.logo_url
      })

    if (error) {
      alert('Error updating profile: ' + error.message)
    } else {
      setSuccess(true)
      if (onProfileUpdate) onProfileUpdate()
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  const inputClass = "w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-stone-900 dark:text-white">{t.profileSettings}</h2>
        <p className="text-stone-400 mt-1">Manage your tailoring brand identity</p>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 shadow-sm dark:shadow-none transition-colors">
        <div className="space-y-6">
          {/* Logo Upload Section */}
          <div className="flex flex-col items-center pb-6 border-b border-stone-100 dark:border-stone-800">
            <label className="text-stone-500 dark:text-stone-400 text-sm font-semibold mb-4 block uppercase tracking-wider self-start">
              {t.brandLogo}
            </label>
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl bg-stone-100 dark:bg-stone-800 border-2 border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center overflow-hidden">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={40} className="text-stone-400" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="text-amber-500 animate-spin" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-amber-500 hover:bg-amber-400 text-stone-950 p-2 rounded-xl cursor-pointer shadow-lg transition-transform hover:scale-110">
                <Upload size={18} />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={uploadLogo}
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-stone-500 text-[10px] mt-4 font-medium italic">
              Recommended: Square image (PNG/JPG)
            </p>
          </div>

          {/* Form Fields */}
          <div>
            <label className="text-stone-500 dark:text-stone-400 text-sm font-semibold mb-2 block uppercase tracking-wider">
              {t.brandName}
            </label>
            <input
              type="text"
              value={form.brand_name}
              onChange={e => setForm({ ...form, brand_name: e.target.value })}
              className={inputClass}
              placeholder="Your Brand Name"
            />
          </div>

          <div>
            <label className="text-stone-500 dark:text-stone-400 text-sm font-semibold mb-2 block uppercase tracking-wider">
              {t.phone}
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
              placeholder="Phone Number"
            />
          </div>

          <button
            onClick={handleUpdate}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
          >
            {success ? <CheckCircle size={20} /> : <Save size={20} />}
            {loading ? '...' : success ? 'Updated!' : t.updateProfile || 'Update Profile'}
          </button>
        </div>
      </div>

      {profile?.role === 'owner' && (
        <div className="bg-white dark:bg-[#0d0d1a] border border-stone-200 dark:border-stone-800 rounded-[32px] overflow-hidden shadow-2xl mt-8">
          <div className="bg-stone-50 dark:bg-white/[0.02] p-6 lg:p-10 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-xl md:text-2xl font-bold text-stone-900 dark:text-white uppercase tracking-tight">
              Remote Worker Access
            </h2>
            <p className="text-stone-500 dark:text-stone-400 mt-2">
              Share this Shop Code with your workers so they can log in via Vastratrack on their own phones.
            </p>
          </div>
          <div className="p-6 lg:p-10">
            <label className="text-stone-500 dark:text-stone-400 text-sm font-semibold mb-2 block uppercase tracking-wider">
              YOUR SHOP CODE
            </label>
            <div className="flex gap-4 items-center">
              <div className="font-mono text-3xl font-bold tracking-[0.2em] text-amber-500 bg-amber-500/10 px-6 py-4 rounded-2xl border border-amber-500/20">
                {shopCode || '...'}
              </div>
              <button 
                onClick={() => { navigator.clipboard.writeText(shopCode); showToast('Copied to clipboard!') }}
                className="p-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-2xl transition-all"
                title="Copy Code"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-4 leading-relaxed">
              <strong>Instructions for your tailors:</strong><br/>
              1. Tell them to open vastratrack.com logic page.<br/>
              2. Click "Worker Login".<br/>
              3. They type this Shop Code exactly as shown.<br/>
              4. They type their Worker ID (e.g. `raju`) and PIN which you created in the Workers Tab.<br/>
              5. The system will automatically log them in without you needing to approve them!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}