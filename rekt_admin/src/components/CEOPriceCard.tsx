interface CEOPriceCardProps {
  price: string | null
  isLoading: boolean
}

export function CEOPriceCard({ price, isLoading }: CEOPriceCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300 group">
      <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">CEO Token Price</h2>
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <div className="w-8 h-4 bg-gray-100 dark:bg-gray-700 animate-pulse rounded"></div>
          <span className="text-sm">Loading...</span>
        </div>
      ) : price ? (
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform inline-block">${price}</span>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">USD</span>
        </div>
      ) : (
        <div className="text-sm font-bold text-red-500 dark:text-red-400">Price unavailable</div>
      )}
    </div>
  )
}

