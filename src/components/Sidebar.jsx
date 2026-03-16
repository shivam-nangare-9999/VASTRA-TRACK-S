import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Users, ShoppingBag, 
  Receipt, UserCog, Menu, X, LogOut, Scissors, Sun, Moon, Languages, Settings 
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { translations } from '../lib/translations'

export default function Sidebar({ session, theme, setTheme, lang, setLang, profile }) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const t = translations[lang]

  const navItems = [
    { name: t.dashboard, path: '/', icon: LayoutDashboard },
    { name: t.customers, path: '/customers', icon: Users },
    { name: t.orders, path: '/orders', icon: ShoppingBag },
    { name: t.billing, path: '/billing', icon: Receipt },
    { name: t.workers, path: '/workers', icon: UserCog },
    { name: t.settings, path: '/settings', icon: Settings },
  ]

  const toggle = () => setIsOpen(!isOpen)

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-[#0d0d1a] border-b border-stone-200 dark:border-white/5 sticky top-0 z-50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center overflow-hidden">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="L" className="w-full h-full object-cover" />
            ) : (
            <Scissors size={20} className="text-stone-950" />
            )}
          </div>
          <span className="font-black text-stone-950 dark:text-white tracking-tight font-['Syne'] uppercase">
            {profile?.brand_name || 'VASTRA'}
          </span>
        </div>
        <button 
          onClick={toggle} 
          className="p-2 text-stone-400 hover:text-white transition-colors focus:outline-none"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-0 z-40 w-full bg-white dark:bg-[#0d0d1a] border-b dark:border-b-0 border-stone-200 dark:border-white/5 
        transform transition-transform duration-300 ease-in-out 
        md:relative md:inset-y-0 md:left-0 md:w-64 md:border-r border-stone-200 dark:border-white/5 md:border-b-0 md:translate-y-0 md:translate-x-0
        ${isOpen ? 'translate-y-0' : '-translate-y-full md:translate-y-0'}
        flex flex-col pt-20 md:pt-0 overflow-y-auto
      `}>
        {/* Desktop Logo Branding */}
        <div className="hidden md:flex items-center gap-3 p-8 transition-colors">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
            <Scissors size={24} className="text-stone-950" />
            )}
          </div>
          <div>
            <h1 className="font-black text-xl text-stone-900 dark:text-white tracking-tight leading-none font-['Syne'] uppercase">
              {profile?.brand_name || 'VASTRA'}
            </h1>
            <p className="text-[10px] text-amber-500/50 font-bold uppercase tracking-widest mt-1">Track</p>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="flex-1 px-4 py-4 md:py-0 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200
                  ${isActive 
                    ? 'bg-amber-500/10 text-amber-500 shadow-[inset_0_0_12px_rgba(245,158,11,0.05)]' 
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5'}`}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Language Switcher */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl text-stone-500">
            <Languages size={18} />
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent border-none text-sm font-bold focus:outline-none cursor-pointer text-stone-500 hover:text-stone-900 dark:hover:text-stone-300"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <div className="px-4 py-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-all"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* Bottom Logout Section */}
        <div className="p-4 border-t border-stone-200 dark:border-white/5">
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm text-red-400/80 hover:text-red-400 hover:bg-red-400/5 transition-all"
          >
            <LogOut size={20} />
            {t.logout}
          </button>
        </div>
      </aside>
    </>
  )
}