import React, { useState } from 'react'
import { ContractExplorer } from './ContractExplorer'
import CEO_TOKEN_ABI from '../abi/CEOToken.json'
import MINTER_ABI from '../abi/MinterContract.json'
import NFT_COLLECTION_ABI from '../abi/NFTCollection.json'
import type { Address } from 'viem'

// Contract addresses from environment variables
const CEO_TOKEN_ADDRESS = (import.meta.env.VITE_CEO_TOKEN_ADDRESS || '0xA5bcA6252a477C4Eb62cDbabF3C16f7c06b4f741') as Address
const MINTER_ADDRESS = (import.meta.env.VITE_MINTER_CONTRACT_ADDRESS || '0xccb8a72cd9149F85c74de4d3d2D756782aa338e8') as Address
const PFP_COLLECTION_ADDRESS = (import.meta.env.VITE_PFP_COLLECTION_ADDRESS || '0x953d13825dc4dB8F5a07D90877d1f4626a355bac') as Address
const MEME_COLLECTION_ADDRESS = (import.meta.env.VITE_MEME_COLLECTION_ADDRESS || '0x5a9f7C350A8f69692e36494FCd42e24640aa804d') as Address

interface ContractInfo {
    id: string
    name: string
    address: Address
    abi: any
}

export const ContractManagerPage: React.FC = () => {
    const contracts: ContractInfo[] = [
        {
            id: 'ceo',
            name: 'CEO Token',
            address: CEO_TOKEN_ADDRESS,
            abi: CEO_TOKEN_ABI
        },
        {
            id: 'minter',
            name: 'Minter Contract',
            address: MINTER_ADDRESS,
            abi: MINTER_ABI
        },
        {
            id: 'pfp',
            name: 'PFP Collection',
            address: PFP_COLLECTION_ADDRESS,
            abi: NFT_COLLECTION_ABI
        },
        {
            id: 'meme',
            name: 'MEME Collection',
            address: MEME_COLLECTION_ADDRESS,
            abi: NFT_COLLECTION_ABI
        }
    ].filter(c => c.address) // Only show contracts with defined addresses

    const [selectedContractId, setSelectedContractId] = useState<string>(contracts[0]?.id || '')

    const selectedContract = contracts.find(c => c.id === selectedContractId)

    if (contracts.length === 0) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Contracts Configured</h2>
                <p className="text-gray-500">Please check your environment variables for contract addresses.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Selector */}
            <div className="w-full md:w-80 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 mb-4">Select Contract</h3>
                <div className="space-y-2">
                    {contracts.map(contract => (
                        <button
                            key={contract.id}
                            onClick={() => setSelectedContractId(contract.id)}
                            className={`w-full text-left px-5 py-4 rounded-2xl transition-all duration-200 group ${selectedContractId === contract.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-100 dark:border-gray-700'
                                }`}
                        >
                            <div className="font-bold text-lg mb-1">{contract.name}</div>
                            <div className={`text-[10px] font-mono truncate px-2 py-1 rounded ${selectedContractId === contract.id ? 'bg-blue-700/50 text-blue-100' : 'bg-gray-100 dark:bg-gray-900 text-gray-400'}`}>
                                {contract.address}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Contract Explorer */}
            <div className="flex-1">
                {selectedContract ? (
                    <ContractExplorer
                        key={selectedContract.id}
                        name={selectedContract.name}
                        address={selectedContract.address}
                        abi={selectedContract.abi}
                    />
                ) : (
                    <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors">
                        <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Select a contract from the list to explore its functions</p>
                    </div>
                )}
            </div>
        </div>
    )
}
