const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Types
export interface TierInfo {
  currentSupply: number
  tierId: number
  priceUSD: string
  priceCEO: string
  remainingInTier: number
}

export interface UserMintInfo {
  address: string
  pfp: {
    mintCount: number
    canMint: boolean
    maxMint: number
  }
  meme: {
    mintCount: number
    canMint: boolean
    maxMint: number
  }
}

export interface UserCEOBalance {
  address: string
  balance: string
  balanceRaw: string
  decimals: number
}

export const api = {
  // Health check
  async checkHealth(): Promise<boolean> {
    console.log("Checking backend health: ", API_URL)
    try {
      const res = await fetch(`${API_URL}/api/health`)
      console.log("Backend is healthy: ", res)
      return res.ok
    } catch (error) {
      console.log("Backend is not healthy: ", error)
      return false
    }
  },

  // Get nonce for SIWE
  async getNonce(address: string): Promise<string> {
    const res = await fetch(`${API_URL}/api/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })


    if (!res.ok) throw new Error('Failed to get nonce')
    const data = await res.json()
    return data.data.nonce
  },

  // Verify signature and get JWT
  async verifySignature(message: string, signature: string): Promise<{ address: string; token: string }> {
    const res = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, signature }),
    })
    if (!res.ok) throw new Error('Failed to verify signature')

    const data = await res.json()
    return data.data
  },

  // Get CEO token price
  async getCEOPrice(): Promise<string> {
    const res = await fetch(`${API_URL}/api/info/ceo-price`)
    if (!res.ok) throw new Error('Failed to get CEO price')
    const data = await res.json()
    return data.data.price
  },

  // Get NFT pricing by type (PFP or MEME)
  async getPricing(nftType: 'PFP' | 'MEME'): Promise<TierInfo> {
    const res = await fetch(`${API_URL}/api/info/pricing/${nftType}`)
    if (!res.ok) throw new Error(`Failed to get ${nftType} pricing`)
    const data = await res.json()
    return data.data
  },

  // Get user mint info by address
  async getUserInfo(address: string): Promise<UserMintInfo> {
    const res = await fetch(`${API_URL}/api/info/user/${address}`)
    if (!res.ok) throw new Error('Failed to get user info')
    const data = await res.json()
    return data.data
  },

  async getUserCEOBalance(address: string): Promise<UserCEOBalance> {
    const res = await fetch(`${API_URL}/api/info/ceo-balance/${address}`)
    if (!res.ok) throw new Error('Failed to get user CEO balance')
    const data = await res.json()
    return data.data
  },

  // Get permit nonce for address
  async getPermitNonce(address: string): Promise<bigint> {
    const res = await fetch(`${API_URL}/api/info/permit-nonce/${address}`)
    if (!res.ok) return 0n
    const data = await res.json()
    return BigInt(data.data?.nonce || 0)
  },

  // Initiate mint
  async initiateMint(
    nftType: 'PFP' | 'MEME',
    imageData: string,
    permitSignature: {
      owner: string
      spender: string
      value: string
      deadline: number
      v: number
      r: string
      s: string
    },
    token: string
  ): Promise<{ taskId: string; status: string; message?: string }> {
    const res = await fetch(`${API_URL}/api/mint/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ nftType, imageData, permitSignature }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Mint failed')

    return {
      taskId: data.data?.id || 'unknown',
      status: data.data?.status || 'queued',
      message: data.message,
    }
  },
}



