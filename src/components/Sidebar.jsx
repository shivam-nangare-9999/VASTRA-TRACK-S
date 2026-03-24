import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Users, ShoppingBag, ReceiptText, 
  UserCog, Package, Settings, LogOut, Menu, X, Sun, Moon, Check, Globe
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Sidebar({ session, theme, setTheme, lang, setLang, profile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const location = useLocation()

  // Determine base nav items
  let navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Orders', path: '/orders', icon: ShoppingBag },
    { name: 'Billing', path: '/billing', icon: ReceiptText },
    { name: 'Workers', path: '/workers', icon: UserCog },
    { name: 'Inventory', path: '/inventory', icon: Package },
  ];

  // Apply RBAC filters if the profile has a specific role set
  if (profile?.role === 'cutter' || profile?.role === 'worker') {
    navItems = navItems.filter(item => ['Orders', 'Customers'].includes(item.name));
  } else if (profile?.role === 'cashier') {
    navItems = navItems.filter(item => ['Dashboard', 'Billing', 'Orders', 'Customers'].includes(item.name));
  }

  const handleLogout = () => supabase.auth.signOut()

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-[#0d0d1a] border-b border-stone-200 dark:border-stone-800 sticky top-0 z-50 transition-colors">
        <div className="flex items-center gap-2">
          {profile?.logo_url ? (
            <div className="w-8 h-8 flex-shrink-0 rounded-lg overflow-hidden bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center">
              <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 flex-shrink-0 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <ShoppingBag size={18} color="white" />
            </div>
          )}
          <span className="font-syne font-bold text-stone-900 dark:text-white max-w-[200px] truncate">
            {profile?.brand_name?.trim() || 'Vastra Track'}
          </span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 rounded-xl bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 
        bg-white dark:bg-[#0d0d1a] 
        border-r border-stone-200 dark:border-stone-800
        transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col shadow-2xl md:shadow-none
      `}>
        {/* Brand Logo */}
        <div className="p-8 hidden md:flex items-center gap-3">
          {profile?.logo_url ? (
            <div className="w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center">
              <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl shadow-xl shadow-amber-500/30 flex items-center justify-center">
              <ShoppingBag size={22} color="white" strokeWidth={2.5} />
            </div>
          )}
          <h1 className="font-syne text-xl font-bold tracking-tight text-stone-900 dark:text-white truncate">
            {profile?.brand_name?.trim() || 'Vastra Track'}
          </h1>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 group
                  ${isActive 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]' 
                    : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white'}
                `}
              >
                <item.icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                />
                {item.name}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Panel */}
        <div className="p-4 bg-stone-50/50 dark:bg-black/20 border-t border-stone-200 dark:border-white/5 space-y-4">
          {/* Toggles */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-400 hover:border-amber-500/50 hover:text-amber-500 transition-all shadow-sm"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span className="text-[10px] font-bold uppercase tracking-wider">{theme}</span>
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-400 hover:border-amber-500/50 hover:text-amber-500 transition-all shadow-sm"
              >
                <Globe size={14} className="opacity-50" />
                <span className="text-base leading-none">
                  {lang === 'en' ? '🇺🇸' : '🇮🇳'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider leading-none">{lang}</span>
              </button>
              
              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-[#0d0d1a] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                    {[
                      { id: 'en', name: 'English', flag: '🇺🇸' },
                      { id: 'hi', name: 'हिंदी', flag: '🇮🇳' },
                      { id: 'mr', name: 'मराठी', flag: '🇮🇳' }
                    ].map((l) => (
                      <button
                        key={l.id}
                        onClick={() => {
                          setLang(l.id);
                          setShowLangMenu(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-amber-500/10 hover:text-amber-500 ${lang === l.id ? 'text-amber-500 bg-amber-500/5' : 'text-stone-500 dark:text-stone-400'}`}
                      >
                        <span className="text-sm">{l.flag}</span>
                        <span className="flex-1">{l.name}</span>
                        {lang === l.id && <Check size={14} className="text-amber-500" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 rounded-[24px] bg-white/50 dark:bg-white/[0.03] border border-stone-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold transform group-hover:scale-105 transition-transform overflow-hidden ${profile?.logo_url ? 'bg-white dark:bg-[#0d0d1a] border border-stone-200 dark:border-stone-800 shadow-sm' : 'bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/20'}`}>
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  (profile?.brand_name || session?.user?.email)?.[0].toUpperCase() || 'V'
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate text-stone-900 dark:text-white leading-tight">
                  {profile?.brand_name || 'My Brand'}
                </p>
                <p className="text-[10px] font-medium text-stone-500 truncate leading-tight mt-0.5">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            {profile?.role === 'owner' && (
              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-stone-600 dark:text-stone-400 bg-stone-500/5 hover:bg-stone-500/10 border border-stone-500/10 transition-all text-[10px] font-bold uppercase tracking-widest mb-2"
              >
                <Settings size={14} />
                Settings
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}