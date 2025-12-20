import { useState, useCallback, useEffect } from 'react'
import { useConnection, useSignTypedData, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt, getBlock, readContract } from 'wagmi/actions'
import { config } from '../config/wagmi'
import { api } from '../services/api'
import type { TierInfo } from '../services/api'
import { ethers } from 'ethers'
import CEO_TOKEN_ABI from '../abi/CEOToken.json'

// EIP-2612 Permit typed data
const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

// Import images statically
import one from '../assets/number/one.png'
import two from '../assets/number/two.png'
import three from '../assets/number/three.png'
import four from '../assets/number/four.png'
import five from '../assets/number/five.png'
import six from '../assets/number/six.png'
import seven from '../assets/number/seven.png'
import eight from '../assets/number/eight.png'
import nine from '../assets/number/nine.png'

const numberImages = [one, two, three, four, five, six, seven, eight, nine]

// Contract addresses - should match backend config
const CEO_TOKEN_ADDRESS = import.meta.env.VITE_CEO_TOKEN_ADDRESS as `0x${string}`
const MINTER_CONTRACT_ADDRESS = import.meta.env.VITE_MINTER_CONTRACT_ADDRESS as `0x${string}`
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID)

// Mint step constants for tracking progress
export const MintStep = {
  IDLE: 'IDLE',
  PREPARING: 'PREPARING',
  SIGNING: 'SIGNING',
  PERMITTING: 'PERMITTING',
  MINTING: 'MINTING',
  COMPLETE: 'COMPLETE',
} as const

export type MintStep = typeof MintStep[keyof typeof MintStep]

// Persisted state structure
interface PersistedMintState {
  step: MintStep
  nftType: 'PFP' | 'MEME'
  imageData: string
  nonce: bigint
  deadline: bigint
  value: string
  tokenName: string
  signature?: string
  v?: number
  r?: string
  s?: string
  permitTxHash?: string
  timestamp: number // To check if state is still valid (deadline not expired)
}

const STORAGE_KEY = 'mint_state'

// Helper to save state to localStorage
function saveMintState(address: string, state: PersistedMintState) {
  try {
    const key = `${STORAGE_KEY}_${address}`
    localStorage.setItem(key, JSON.stringify({
      ...state,
      nonce: state.nonce.toString(),
      deadline: state.deadline.toString(),
    }))
  } catch (e) {
    console.warn('Failed to save mint state:', e)
  }
}

// Helper to load state from localStorage
function loadMintState(address: string): PersistedMintState | null {
  try {
    const key = `${STORAGE_KEY}_${address}`
    const stored = localStorage.getItem(key)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    return {
      ...parsed,
      nonce: BigInt(parsed.nonce),
      deadline: BigInt(parsed.deadline),
    }
  } catch (e) {
    console.warn('Failed to load mint state:', e)
    return null
  }
}

// Helper to clear persisted state
function clearMintState(address: string) {
  try {
    const key = `${STORAGE_KEY}_${address}`
    localStorage.removeItem(key)
  } catch (e) {
    console.warn('Failed to clear mint state:', e)
  }
}

// Check if persisted state is still valid (deadline not expired)
async function isStateValid(state: PersistedMintState): Promise<boolean> {
  try {
    const block = await getBlock(config)
    // State is valid if deadline is still in the future (with 5 min buffer)
    return state.deadline > block.timestamp + BigInt(300)
  } catch {
    return false
  }
}

export const useMint = (token: string | null, pfpPricing: TierInfo | null, memePricing: TierInfo | null) => {
  const { address } = useConnection()
  const { signTypedDataAsync } = useSignTypedData()
  const { writeContractAsync } = useWriteContract()
  const [isMinting, setIsMinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<MintStep>(MintStep.IDLE)
  const [hasPendingMint, setHasPendingMint] = useState(false)

  // Check for pending mint on mount/address change
  useEffect(() => {
    async function checkPendingState() {
      if (!address) {
        setHasPendingMint(false)
        return
      }
      
      const savedState = loadMintState(address)
      if (savedState && savedState.step !== MintStep.IDLE && savedState.step !== MintStep.COMPLETE) {
        const valid = await isStateValid(savedState)
        if (valid) {
          setHasPendingMint(true)
          setCurrentStep(savedState.step)
        } else {
          // State expired, clear it
          clearMintState(address)
          setHasPendingMint(false)
        }
      }
    }
    checkPendingState()
  }, [address])

  // Clear any pending mint state
  const clearPendingMint = useCallback(() => {
    if (address) {
      clearMintState(address)
      setHasPendingMint(false)
      setCurrentStep(MintStep.IDLE)
    }
  }, [address])

  // Resume a pending mint from where it left off
  const resumeMint = useCallback(async () => {
    if (!token || !address) {
      throw new Error('Not authenticated')
    }

    const savedState = loadMintState(address)
    if (!savedState) {
      throw new Error('No pending mint found')
    }

    const valid = await isStateValid(savedState)
    if (!valid) {
      clearMintState(address)
      setHasPendingMint(false)
      throw new Error('Mint session expired, please start again')
    }

    setIsMinting(true)
    setError(null)

    try {
      const { step, nftType, imageData, nonce, deadline, value, tokenName, signature, v, r, s, permitTxHash: _permitTxHash } = savedState

      // Resume from the appropriate step
      if (step === MintStep.SIGNING || step === MintStep.PREPARING) {
        // Need to sign again
        setCurrentStep(MintStep.SIGNING)
        
        const newSignature = await signTypedDataAsync({
          domain: {
            name: tokenName,
            version: '1',
            chainId: CHAIN_ID,
            verifyingContract: CEO_TOKEN_ADDRESS,
          },
          types: PERMIT_TYPES,
          primaryType: 'Permit',
          message: {
            owner: address,
            spender: MINTER_CONTRACT_ADDRESS,
            value: BigInt(value),
            nonce,
            deadline,
          },
        })

        const parsedSig = ethers.Signature.from(newSignature)
        
        // Update state with signature
        saveMintState(address, {
          ...savedState,
          step: MintStep.PERMITTING,
          signature: newSignature,
          v: parsedSig.v,
          r: parsedSig.r,
          s: parsedSig.s,
        })
        setCurrentStep(MintStep.MINTING)

        // Continue to mint - mintNFTWithPermit handles permit internally
        const result = await api.initiateMint(
          nftType,
          imageData,
          {
            owner: address,
            spender: MINTER_CONTRACT_ADDRESS,
            value: value,
            deadline: Number(deadline),
            v: parsedSig.v,
            r: parsedSig.r,
            s: parsedSig.s,
          },
          token
        )

        // Clear state on success
        clearMintState(address)
        setHasPendingMint(false)
        setCurrentStep(MintStep.COMPLETE)
        console.log('Mint complete .... result', result)
        return result

      } else if (step === MintStep.PERMITTING && signature && v !== undefined && r && s) {
        // Signature exists, proceed directly to mint - mintNFTWithPermit handles permit internally
        setCurrentStep(MintStep.MINTING)

        // Continue to mint
        const result = await api.initiateMint(
          nftType,
          imageData,
          {
            owner: address,
            spender: MINTER_CONTRACT_ADDRESS,
            value: value,
            deadline: Number(deadline),
            v,
            r,
            s,
          },
          token
        )

        // Clear state on success
        clearMintState(address)
        setHasPendingMint(false)
        setCurrentStep(MintStep.COMPLETE)
        console.log('Mint complete .... result', result)
        return result

      } else if (step === MintStep.MINTING && v !== undefined && r && s) {
        // Permit was done, just need to call mint API
        setCurrentStep(MintStep.MINTING)
        
        const result = await api.initiateMint(
          nftType,
          imageData,
          {
            owner: address,
            spender: MINTER_CONTRACT_ADDRESS,
            value: value,
            deadline: Number(deadline),
            v,
            r,
            s,
          },
          token
        )

        // Clear state on success
        clearMintState(address)
        setHasPendingMint(false)
        setCurrentStep(MintStep.COMPLETE)
        console.log('Mint complete .... result', result)
        return result
      }

      throw new Error('Invalid state for resume')
    } catch (err: any) {
      const message = err.shortMessage || err.message || 'Resume mint failed'
      setError(message)
      throw new Error(message)
    } finally {
      setIsMinting(false)
    }
  }, [token, address, signTypedDataAsync, writeContractAsync])

  const mint = useCallback(async (nftType: 'PFP' | 'MEME') => {
    if (!token || !address) {
      throw new Error('Not authenticated')
    }

    setIsMinting(true)
    setError(null)
    setCurrentStep(MintStep.PREPARING)

    try {
      // 1. Pick a random image from assets
      const randomImage = numberImages[Math.floor(Math.random() * numberImages.length)]
      const imageData = await fetchImageAsBase64(randomImage)

      // 2. Get permit nonce from backend or use 0 for testing
      const nonce = await api.getPermitNonce(address)
      
      // 3. Create permit params - use block.timestamp for accurate deadline
      const block = await getBlock(config)
      const deadline = block.timestamp + BigInt(3600) // current block timestamp + 1 hour
      let value = BigInt('1000000000000000000000000') // 1,000,000 CEO token (placeholder)

      if(nftType === 'PFP' && pfpPricing?.priceCEO) {
        value = BigInt(ethers.parseUnits(pfpPricing.priceCEO, 18))
      } else if(nftType === 'MEME' && memePricing?.priceCEO) {
        value = BigInt(ethers.parseUnits(memePricing.priceCEO, 18))
      }

      // 4. Fetch the token name from the contract for EIP-712 domain
      const tokenName = await readContract(config, {
        address: CEO_TOKEN_ADDRESS,
        abi: CEO_TOKEN_ABI,
        functionName: 'name',
      }) as string
      console.log('Token name from contract:', tokenName)

      // Save initial state before signing
      saveMintState(address, {
        step: MintStep.SIGNING,
        nftType,
        imageData,
        nonce,
        deadline,
        value: value.toString(),
        tokenName,
        timestamp: Date.now(),
      })
      setCurrentStep(MintStep.SIGNING)
      setHasPendingMint(true)

      // 5. Sign the permit
      const signature = await signTypedDataAsync({
        domain: {
          name: tokenName, // Use the actual token name from the contract
          version: '1',
          chainId: CHAIN_ID, // Sepolia testnet
          verifyingContract: CEO_TOKEN_ADDRESS,
        },
        types: PERMIT_TYPES,
        primaryType: 'Permit',
        message: {
          owner: address,
          spender: MINTER_CONTRACT_ADDRESS,
          value,
          nonce,
          deadline,
        },
      })

      // 6. Parse signature into r, s, v
      const { v, r, s } = ethers.Signature.from(signature);

      console.log('v', v)
      console.log('r', r)
      console.log('s', s)

      // Update state after signing
      saveMintState(address, {
        step: MintStep.PERMITTING,
        nftType,
        imageData,
        nonce,
        deadline,
        value: value.toString(),
        tokenName,
        signature,
        v,
        r,
        s,
        timestamp: Date.now(),
      })
      setCurrentStep(MintStep.MINTING)

      // 7. Call mint endpoint - mintNFTWithPermit will handle permit validation internally
      // NOTE: Do NOT call permit() separately - the signature will be consumed by mintNFTWithPermit
      const result = await api.initiateMint(
        nftType,
        imageData,
        {
          owner: address,
          spender: MINTER_CONTRACT_ADDRESS,
          value: value.toString(),
          deadline: Number(deadline),
          v,
          r,
          s,
        },
        token
      )

      console.log('Mint complete .... result', result)

      // Clear state on success
      clearMintState(address)
      setHasPendingMint(false)
      setCurrentStep(MintStep.COMPLETE)

      return result
    } catch (err: any) {
      const message = err.shortMessage || err.message || 'Mint failed'
      setError(message)
      throw new Error(message)
    } finally {
      setIsMinting(false)
    }
  }, [token, address, signTypedDataAsync, writeContractAsync, pfpPricing, memePricing])

  return { 
    mint, 
    resumeMint,
    clearPendingMint,
    isMinting, 
    error, 
    currentStep,
    hasPendingMint,
  }
}

// Convert image URL to base64
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

