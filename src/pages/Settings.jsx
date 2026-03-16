import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'
import { User, Save, CheckCircle, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'

export default function Settings({ theme, lang, profile, onProfileUpdate }) {
  const t = translations[lang]
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
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
    }
  }, [profile])

  async function uploadLogo(e) {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${profile.id}/logo-${Math.random()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      // Update Profile immediately for the logo
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: publicUrl })
        .eq('id', profile.id)

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
    
    const { error } = await supabase
      .from('profiles')
      .update({
        brand_name: form.brand_name,
        phone: form.phone
      })
      .eq('id', profile.id)

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
        <h2 className="text-3xl font-black text-stone-900 dark:text-white">{t.profileSettings}</h2>
        <p className="text-stone-400 mt-1">Manage your tailoring brand identity</p>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 shadow-sm dark:shadow-none transition-colors">
        <div className="space-y-6">
          {/* Logo Upload Section */}
          <div className="flex flex-col items-center pb-6 border-b border-stone-100 dark:border-stone-800">
            <label className="text-stone-500 dark:text-stone-400 text-sm font-bold mb-4 block uppercase tracking-wider self-start">
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
            <label className="text-stone-500 dark:text-stone-400 text-sm font-bold mb-2 block uppercase tracking-wider">
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
            <label className="text-stone-500 dark:text-stone-400 text-sm font-bold mb-2 block uppercase tracking-wider">
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
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
          >
            {success ? <CheckCircle size={20} /> : <Save size={20} />}
            {loading ? '...' : success ? 'Updated!' : t.updateProfile}
          </button>
        </div>
      </div>
    </div>
  )
}