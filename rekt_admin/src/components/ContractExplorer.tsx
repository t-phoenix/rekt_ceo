import React, { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits, type Address } from 'viem'

interface ContractExplorerProps {
    address: Address
    abi: any
    name: string
}

type FunctionGroup = 'Access Control' | 'Standards' | 'Metadata' | 'Core Logic' | 'Configuration' | 'Other'

const getFunctionGroup = (funcName: string): FunctionGroup => {
    const name = funcName.toLowerCase()

    // Access Control
    if (name.includes('role') || name.includes('admin') || name.includes('owner') || name.includes('access')) {
        return 'Access Control'
    }

    // Standards (ERC20, ERC721, ERC1155)
    if (['balanceof', 'ownerof', 'transfer', 'transferfrom', 'approve', 'allowance', 'isapprovedforall', 'setapprovalforall', 'safeptransferfrom', 'safemint'].includes(name)) {
        return 'Standards'
    }

    // Metadata
    if (['name', 'symbol', 'decimals', 'totalprecision', 'version', 'isinconfigured', 'supportsinterface', 'getcurrenttokenid', 'uri', 'tokenuri'].includes(name)) {
        return 'Metadata'
    }

    // Configuration
    if (name.startsWith('set') || name.startsWith('update') || name.includes('config') || name.includes('treasury') || name.includes('router')) {
        return 'Configuration'
    }

    // Core Logic (Minting, Pricing, Liquidity)
    if (name.includes('mint') || name.includes('price') || name.includes('tier') || name.includes('liquidity') || name.includes('swap') || name.includes('pool')) {
        return 'Core Logic'
    }

    return 'Other'
}

export const ContractExplorer: React.FC<ContractExplorerProps> = ({ address, abi, name }) => {
    const { address: userAddress, isConnected } = useAccount()

    const [activeTab, setActiveTab] = useState<'read' | 'write'>('read')

    const functions = abi.filter((item: any) => item.type === 'function')

    const readFunctions = functions.filter((item: any) =>
        item.stateMutability === 'view' || item.stateMutability === 'pure'
    )

    const writeFunctions = functions.filter((item: any) =>
        item.stateMutability !== 'view' && item.stateMutability !== 'pure'
    )

    const currentFunctions = activeTab === 'read' ? readFunctions : writeFunctions

    // Group functions
    const groupedFunctions = currentFunctions.reduce((acc: Record<FunctionGroup, any[]>, func: any) => {
        const group = getFunctionGroup(func.name)
        if (!acc[group]) acc[group] = []
        acc[group].push(func)
        return acc
    }, {} as Record<FunctionGroup, any[]>)

    // Sort groups for consistent display
    const groupOrder: FunctionGroup[] = ['Core Logic', 'Metadata', 'Standards', 'Configuration', 'Access Control', 'Other']

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{name}</h3>
                    <code className="text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded italic">{address}</code>
                </div>
                <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('read')}
                        className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'read'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        Read
                    </button>
                    <button
                        onClick={() => setActiveTab('write')}
                        className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'write'
                            ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        Write
                    </button>
                </div>
            </div>

            <div className="p-6">
                {!isConnected && activeTab === 'write' && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400 px-4 py-3 rounded-xl text-sm mb-8 flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Please connect your wallet to execute write functions.</span>
                    </div>
                )}

                <div className="space-y-12">
                    {groupOrder.map(group => {
                        const funcs = groupedFunctions[group]
                        if (!funcs || funcs.length === 0) return null

                        return (
                            <div key={group}>
                                <div className="flex items-center gap-4 mb-6">
                                    <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{group}</h4>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700/50 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {funcs.map((func: any, idx: number) => (
                                        activeTab === 'read'
                                            ? <ReadFunction key={`${func.name}-${idx}`} address={address} abi={abi} func={func} userAddress={userAddress} />
                                            : <WriteFunction key={`${func.name}-${idx}`} address={address} abi={abi} func={func} isConnected={isConnected} />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

const ReadFunction: React.FC<{ address: Address; abi: any; func: any; userAddress?: Address }> = ({ address, abi, func, userAddress }) => {
    const [inputs, setInputs] = useState<string[]>(() => {
        // Auto-fill address inputs if user is connected
        return func.inputs.map((input: any) =>
            (userAddress && (input.type === 'address' || input.name === 'user' || input.name === 'owner')) ? userAddress : ''
        )
    })

    // Only auto-read if there are no inputs
    const shouldAutoRead = func.inputs.length === 0

    const { data, error, isFetching, refetch } = useReadContract({
        address,
        abi,
        functionName: func.name,
        args: inputs.every(i => i !== '') && inputs.length > 0 ? inputs : (inputs.length === 0 ? [] : undefined),
        query: {
            enabled: shouldAutoRead
        }
    })

    const handleRead = () => {
        refetch()
    }

    const handleInputChange = (index: number, value: string) => {
        const newInputs = [...inputs]
        newInputs[index] = value
        setInputs(newInputs)
    }

    return (
        <div className="border border-gray-100 dark:border-gray-700/50 rounded-2xl p-5 hover:border-blue-300 dark:hover:border-blue-700/50 transition-all bg-white dark:bg-gray-800/50 hover:shadow-lg hover:shadow-blue-500/5 group">
            <div className="flex justify-between items-start mb-4">
                <h4 className="font-mono text-sm font-black text-blue-700 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{func.name}</h4>
                <button
                    onClick={handleRead}
                    disabled={isFetching || (func.inputs.length > 0 && inputs.some(i => i === ''))}
                    className="text-xs font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 disabled:opacity-30 transition-colors"
                >
                    {isFetching ? 'Reading...' : 'Read'}
                </button>
            </div>

            {func.inputs.length > 0 && (
                <div className="grid grid-cols-1 gap-4 mb-5">
                    {func.inputs.map((input: any, i: number) => (
                        <div key={i}>
                            <label className="block text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black mb-1.5">
                                {input.name || `input${i}`} ({input.type})
                            </label>
                            <input
                                type="text"
                                value={inputs[i]}
                                onChange={(e) => handleInputChange(i, e.target.value)}
                                placeholder={input.type}
                                className="w-full text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-800 transition-all dark:text-gray-200"
                            />
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-2">
                <div className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black mb-1.5">Result</div>
                <div className="text-xs font-mono break-all bg-gray-50 dark:bg-gray-900/80 p-3 rounded-xl dark:text-gray-300 border border-gray-100 dark:border-gray-800 min-h-[40px] flex items-center">
                    {data !== undefined ? formatResult(data) : error ? <span className="text-red-500 dark:text-red-400">{error.message}</span> : <span className="text-gray-300 dark:text-gray-600 italic">Pending query...</span>}
                </div>
            </div>
        </div>
    )
}

const WriteFunction: React.FC<{ address: Address; abi: any; func: any; isConnected: boolean }> = ({ address, abi, func, isConnected }) => {
    const [inputs, setInputs] = useState<string[]>(func.inputs.map(() => ''))

    const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
    const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash })

    const handleInputChange = (index: number, value: string) => {
        const newInputs = [...inputs]
        newInputs[index] = value
        setInputs(newInputs)
    }

    const handleWrite = async () => {
        try {
            const args = inputs.map((input, idx) => {
                const type = func.inputs[idx].type
                if (type.includes('[]')) {
                    return JSON.parse(input)
                }
                if (type.startsWith('uint') || type.startsWith('int')) {
                    if (input.includes('.') || input.length > 15) {
                        // Likely needs decimals handling, but for now just parse as bigint
                        // A better dev tool would have a "parse units" toggle
                        return BigInt(input.replace(/,/g, ''))
                    }
                    return BigInt(input)
                }
                if (type === 'bool') {
                    return input.toLowerCase() === 'true'
                }
                return input
            })

            writeContract({
                address,
                abi,
                functionName: func.name,
                args,
            })
        } catch (e: any) {
            console.error(e)
        }
    }

    return (
        <div className="border border-gray-100 dark:border-gray-700/50 rounded-2xl p-5 hover:border-orange-300 dark:hover:border-orange-700/50 transition-all bg-white dark:bg-gray-800/50 hover:shadow-lg hover:shadow-orange-500/5 group">
            <div className="flex justify-between items-start mb-4">
                <h4 className="font-mono text-sm font-black text-orange-700 dark:text-orange-400 group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors">{func.name}</h4>
                <button
                    onClick={handleWrite}
                    disabled={!isConnected || isPending || isConfirming || inputs.some(i => i === '')}
                    className="text-xs font-bold bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-4 py-1.5 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/60 disabled:opacity-30 transition-colors"
                >
                    {isPending || isConfirming ? 'Processing...' : 'Write'}
                </button>
            </div>

            {func.inputs.length > 0 && (
                <div className="grid grid-cols-1 gap-4 mb-4">
                    {func.inputs.map((input: any, i: number) => (
                        <div key={i}>
                            <label className="block text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black mb-1.5">
                                {input.name || `input${i}`} ({input.type})
                            </label>
                            <input
                                type="text"
                                value={inputs[i]}
                                onChange={(e) => handleInputChange(i, e.target.value)}
                                placeholder={input.type}
                                className="w-full text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-800 transition-all dark:text-gray-200"
                            />
                        </div>
                    ))}
                </div>
            )}

            {(writeError || confirmError) && (
                <div className="mt-4 text-[11px] text-red-600 dark:text-red-400 font-mono break-all p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                    <span className="font-black uppercase mr-2">Error:</span>
                    {writeError?.name || 'Error'}: {writeError?.message || confirmError?.message}
                </div>
            )}

            {isSuccess && hash && (
                <div className="mt-4 text-[11px] text-green-600 dark:text-green-400 font-mono break-all p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/30">
                    <span className="font-black uppercase mr-2">Success!</span>
                    Hash: {hash}
                </div>
            )}
        </div>
    )
}

const formatResult = (result: any): string => {
    if (result === null || result === undefined) return 'null'
    if (typeof result === 'bigint') return result.toString()
    if (typeof result === 'object') {
        if (Array.isArray(result)) {
            return `[${result.map(formatResult).join(', ')}]`
        }
        return JSON.stringify(result, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)
    }
    return String(result)
}
