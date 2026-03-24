import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ currentPage, totalPages, onPageChange, theme }) {
  if (totalPages <= 1) return null

  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  const btnBase = `w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200`

  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${btnBase} ${
          currentPage === 1
            ? 'opacity-30 cursor-not-allowed'
            : theme === 'dark'
              ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
        }`}
      >
        <ChevronLeft size={16} />
      </button>

      {/* First page + ellipsis */}
      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className={`${btnBase} ${
              theme === 'dark' ? 'text-stone-400 hover:bg-stone-800 hover:text-white' : 'text-stone-500 hover:bg-stone-100'
            }`}
          >1</button>
          {start > 2 && (
            <span className="text-stone-500 text-xs px-1">…</span>
          )}
        </>
      )}

      {/* Page numbers */}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`${btnBase} ${
            p === currentPage
              ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20'
              : theme === 'dark'
                ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
          }`}
        >
          {p}
        </button>
      ))}

      {/* Last page + ellipsis */}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="text-stone-500 text-xs px-1">…</span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            className={`${btnBase} ${
              theme === 'dark' ? 'text-stone-400 hover:bg-stone-800 hover:text-white' : 'text-stone-500 hover:bg-stone-100'
            }`}
          >{totalPages}</button>
        </>
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${btnBase} ${
          currentPage === totalPages
            ? 'opacity-30 cursor-not-allowed'
            : theme === 'dark'
              ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
        }`}
      >
        <ChevronRight size={16} />
      </button>

      {/* Page info */}
      <span className="ml-3 text-xs text-stone-500 font-medium">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  )
}

export function usePagination(items, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  return {
    totalPages,
    getPageItems: (page) => {
      const start = (page - 1) * pageSize
      return items.slice(start, start + pageSize)
    },
  }
}
