import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, theme, danger = true }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl p-6 border shadow-2xl ${
          theme === 'dark'
            ? 'bg-stone-900 border-stone-800'
            : 'bg-white border-stone-200'
        }`}
        style={{ animation: 'toast-enter 0.25s ease' }}
      >
        {/* Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            danger ? 'bg-red-500/10' : 'bg-amber-500/10'
          }`}>
            <AlertTriangle size={20} className={danger ? 'text-red-400' : 'text-amber-400'} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold text-base ${
              theme === 'dark' ? 'text-white' : 'text-stone-900'
            }`}>{title}</h3>
          </div>
          <button onClick={onCancel} className="text-stone-500 hover:text-stone-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className={`text-sm mb-6 leading-relaxed ${
          theme === 'dark' ? 'text-stone-400' : 'text-stone-500'
        }`}>{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`flex-1 font-semibold py-2.5 rounded-xl transition-colors text-sm ${
              danger
                ? 'bg-red-500 hover:bg-red-400 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
            }`}
          >
            {confirmLabel || 'Confirm'}
          </button>
          <button
            onClick={onCancel}
            className={`flex-1 font-semibold py-2.5 rounded-xl transition-colors text-sm ${
              theme === 'dark'
                ? 'bg-stone-800 hover:bg-stone-700 text-white'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
            }`}
          >
            {cancelLabel || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
