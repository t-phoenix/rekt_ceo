/*global BigInt*/
const API_URL = process.env.REACT_APP_BACKEND_API_URL
export const api = {
  // Health check
  async checkHealth() {
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
  async getNonce(address) {
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
  async verifySignature(message, signature) {
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
  async getCEOPrice() {
    const res = await fetch(`${API_URL}/api/info/ceo-price`)
    if (!res.ok) throw new Error('Failed to get CEO price')
    const data = await res.json()
    return data.data.price
  },

  // Get NFT pricing by type (PFP or MEME)
  async getPricing(nftType) {
    const res = await fetch(`${API_URL}/api/info/pricing/${nftType}`)
    if (!res.ok) throw new Error(`Failed to get ${nftType} pricing`)
    const data = await res.json()
    console.log("Pricing Data HERE: ", data)
    return data.data
  },

  // Get user mint info by address
  async getUserInfo(address) {
    const res = await fetch(`${API_URL}/api/info/user/${address}`)
    if (!res.ok) throw new Error('Failed to get user info')
    const data = await res.json()
    return data.data
  },

  async getUserCEOBalance(address) {
    const res = await fetch(`${API_URL}/api/info/ceo-balance/${address}`)
    if (!res.ok) throw new Error('Failed to get user CEO balance')
    const data = await res.json()
    return data.data
  },

  // Get permit nonce for address
  async getPermitNonce(address) {
    const res = await fetch(`${API_URL}/api/info/permit-nonce/${address}`)
    if (!res.ok) return 0n
    const data = await res.json()
    return BigInt(data.data?.nonce || 0)
  },

  // Initiate mint
  async initiateMint(
    nftType,
    imageData,
    permitSignature,
    token
  ) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/api/mint/initiate`, {
      method: 'POST',
      headers,
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
