import { useState, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import type { UserMintInfo } from '../services/api'

interface UserInfoLookupProps {
  userInfo: UserMintInfo | null
  isLoading: boolean
  error: string | null
  onLookup: (address: string) => void
  connectedAddress?: string
}

interface MintInfoBoxProps {
  title: string
  mintCount: number
  maxMint: number
  canMint: boolean
}

function MintInfoBox({ title, mintCount, maxMint, canMint }: MintInfoBoxProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-medium text-gray-800 mb-2">{title}</h3>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Minted:</span>
          <span>{mintCount} / {maxMint}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Can Mint:</span>
          <span className={canMint ? 'text-green-600' : 'text-red-600'}>
            {canMint ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    </div>
  )
}

export function UserInfoLookup({
  userInfo,
  isLoading,
  error,
  onLookup,
  connectedAddress,
}: UserInfoLookupProps) {
  const [address, setAddress] = useState(connectedAddress ?? '')

  // Update address when connected wallet changes
  useEffect(() => {
    if (connectedAddress) {
      setAddress(connectedAddress)
      handleLookup()
    }
  }, [connectedAddress])

  const handleLookup = () => {
    if (address.trim()) {
      onLookup(address.trim())
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLookup()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">User Info Lookup</h2>
      
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter wallet address (0x...)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleLookup}
          disabled={isLoading || !address.trim()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Loading...' : 'Lookup'}
        </button>
      </div>

      {error && (
        <div className="text-red-600 mb-4">{error}</div>
      )}

      {userInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MintInfoBox
            title="PFP NFTs"
            mintCount={userInfo.pfp.mintCount}
            maxMint={userInfo.pfp.maxMint}
            canMint={userInfo.pfp.canMint}
          />
          <MintInfoBox
            title="MEME NFTs"
            mintCount={userInfo.meme.mintCount}
            maxMint={userInfo.meme.maxMint}
            canMint={userInfo.meme.canMint}
          />
        </div>
      )}
    </div>
  )
}

