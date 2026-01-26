import type { Address } from 'viem'
import { formatTokenAmount } from '../utils/formatNumber'

interface ApproveInterfaceProps {
  ceoAmount: string
  setCeoAmount: (value: string) => void
  usdcAmount: string
  setUsdcAmount: (value: string) => void
  onApproveCEO: (amount: string) => void
  onApproveUSDC: (amount: string) => void
  ceoApprovalPending: boolean
  usdcApprovalPending: boolean
  ceoApprovalSuccess: boolean
  usdcApprovalSuccess: boolean
  ceoError: Error | null
  usdcError: Error | null
  tokenBalances: { token0: string; token1: string } | undefined
  balancesLoading: boolean
  ceoAllowance?: string
  usdcAllowance?: string
  ceoAllowanceLoading?: boolean
  usdcAllowanceLoading?: boolean
  CEOAddress: Address
  USDCAddress: Address
  routerAddress: Address
}

export function ApproveInterface({
  ceoAmount,
  setCeoAmount,
  usdcAmount,
  setUsdcAmount,
  onApproveCEO,
  onApproveUSDC,
  ceoApprovalPending,
  usdcApprovalPending,
  ceoApprovalSuccess,
  usdcApprovalSuccess,
  ceoError,
  usdcError,
  tokenBalances,
  balancesLoading,
  ceoAllowance,
  usdcAllowance,
  ceoAllowanceLoading,
  usdcAllowanceLoading,
  CEOAddress: _CEOAddress,
  USDCAddress: _USDCAddress,
  routerAddress: _routerAddress,
}: ApproveInterfaceProps) {
  const handleMaxCEO = () => {
    if (tokenBalances) {
      setCeoAmount(tokenBalances.token0)
    }
  }

  const handleMaxUSDC = () => {
    if (tokenBalances) {
      setUsdcAmount(tokenBalances.token1)
    }
  }

  const canApproveCEO =
    ceoAmount &&
    parseFloat(ceoAmount) > 0 &&
    parseFloat(ceoAmount) <= parseFloat(tokenBalances?.token0 || '0') &&
    !ceoApprovalPending &&
    !usdcApprovalPending

  const canApproveUSDC =
    usdcAmount &&
    parseFloat(usdcAmount) > 0 &&
    parseFloat(usdcAmount) <= parseFloat(tokenBalances?.token1 || '0') &&
    !ceoApprovalPending &&
    !usdcApprovalPending

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 transition-colors">
        <p className="text-sm text-blue-800 dark:text-blue-400">
          <strong>Tip:</strong> Approve tokens to allow the Uniswap router to spend them on your behalf.
          You can approve any amount up to your balance. This approval is required before swapping or adding liquidity.
        </p>
      </div>

      {/* CEO Token Approval */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CEO Token Approval</label>
          <div className="flex flex-col items-end gap-1">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Balance:{' '}
              {balancesLoading ? (
                <span className="text-gray-400 dark:text-gray-500">Loading...</span>
              ) : (
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {formatTokenAmount(tokenBalances?.token0 || '0', { symbol: 'CEO', maxDecimals: 6 })}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Currently Approved:{' '}
              {ceoAllowanceLoading ? (
                <span className="text-gray-300 dark:text-gray-600">Loading...</span>
              ) : (
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {formatTokenAmount(ceoAllowance || '0', { symbol: 'CEO', maxDecimals: 6 })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              value={ceoAmount}
              onChange={(e) => setCeoAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 text-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              disabled={ceoApprovalPending || usdcApprovalPending}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMaxCEO}
              className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                ceoApprovalPending ||
                usdcApprovalPending ||
                !tokenBalances?.token0 ||
                parseFloat(tokenBalances.token0) === 0
              }
            >
              MAX
            </button>
            <div className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">
              CEO
            </div>
          </div>
        </div>

        {/* CEO Error Messages */}
        {ceoAmount && parseFloat(ceoAmount) > parseFloat(tokenBalances?.token0 || '0') && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded text-sm">
            Insufficient CEO balance
          </div>
        )}
        {ceoError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
            CEO approval failed: {ceoError.message}
          </div>
        )}
        {ceoApprovalSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded text-sm">
            CEO token approved successfully!
          </div>
        )}

        {/* CEO Approve Button */}
        <button
          onClick={() => onApproveCEO(ceoAmount)}
          disabled={!canApproveCEO}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${canApproveCEO
              ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-500 dark:hover:bg-indigo-600'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
            }`}
        >
          {ceoApprovalPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Approving CEO...
            </span>
          ) : !ceoAmount || parseFloat(ceoAmount) === 0 ? (
            'Enter CEO amount'
          ) : parseFloat(ceoAmount) > parseFloat(tokenBalances?.token0 || '0') ? (
            'Insufficient balance'
          ) : (
            `Approve ${formatTokenAmount(ceoAmount, { symbol: 'CEO', maxDecimals: 6 })}`
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center">
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
        <div className="px-4 text-sm text-gray-500 dark:text-gray-400">OR</div>
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
      </div>

      {/* USDC Token Approval */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">USDC Token Approval</label>
          <div className="flex flex-col items-end gap-1">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Balance:{' '}
              {balancesLoading ? (
                <span className="text-gray-400 dark:text-gray-500">Loading...</span>
              ) : (
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {formatTokenAmount(tokenBalances?.token1 || '0', { symbol: 'USDC', maxDecimals: 6 })}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Currently Approved:{' '}
              {usdcAllowanceLoading ? (
                <span className="text-gray-300 dark:text-gray-600">Loading...</span>
              ) : (
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {formatTokenAmount(usdcAllowance || '0', { symbol: 'USDC', maxDecimals: 6 })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              value={usdcAmount}
              onChange={(e) => setUsdcAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 text-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              disabled={ceoApprovalPending || usdcApprovalPending}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMaxUSDC}
              className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                ceoApprovalPending ||
                usdcApprovalPending ||
                !tokenBalances?.token1 ||
                parseFloat(tokenBalances.token1) === 0
              }
            >
              MAX
            </button>
            <div className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">
              USDC
            </div>
          </div>
        </div>

        {/* USDC Error Messages */}
        {usdcAmount && parseFloat(usdcAmount) > parseFloat(tokenBalances?.token1 || '0') && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded text-sm">
            Insufficient USDC balance
          </div>
        )}
        {usdcError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
            USDC approval failed: {usdcError.message}
          </div>
        )}
        {usdcApprovalSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded text-sm">
            USDC token approved successfully!
          </div>
        )}

        {/* USDC Approve Button */}
        <button
          onClick={() => onApproveUSDC(usdcAmount)}
          disabled={!canApproveUSDC}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${canApproveUSDC
              ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-500 dark:hover:bg-indigo-600'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
            }`}
        >
          {usdcApprovalPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Approving USDC...
            </span>
          ) : !usdcAmount || parseFloat(usdcAmount) === 0 ? (
            'Enter USDC amount'
          ) : parseFloat(usdcAmount) > parseFloat(tokenBalances?.token1 || '0') ? (
            'Insufficient balance'
          ) : (
            `Approve ${formatTokenAmount(usdcAmount, { symbol: 'USDC', maxDecimals: 6 })}`
          )}
        </button>
      </div>
    </div>
  )
}

