interface CEOPriceCardProps {
  price: string | null
  isLoading: boolean
}

export function CEOPriceCard({ price, isLoading }: CEOPriceCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">CEO Token Price</h2>
      {isLoading ? (
        <div className="text-gray-500">Loading price...</div>
      ) : price ? (
        <div className="text-3xl font-bold text-indigo-600">${price}</div>
      ) : (
        <div className="text-gray-500">Unable to fetch price</div>
      )}
    </div>
  )
}

