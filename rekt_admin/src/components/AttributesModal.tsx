import { useEffect, useRef } from 'react'

// ─── Dummy attribute definitions ────────────────────────────────────────────

export interface NFTAttribute {
    trait_type: string
    value: string | number
}

export const DUMMY_PFP_ATTRIBUTES: NFTAttribute[] = [
    { trait_type: 'Background', value: 'Cosmic Purple' },
    { trait_type: 'Skin', value: 'Golden' },
    { trait_type: 'Eyes', value: 'Laser Red' },
    { trait_type: 'Mouth', value: 'Smirk' },
    { trait_type: 'Head', value: 'Diamond Crown' },
    { trait_type: 'Outfit', value: 'CEO Suit' },
    { trait_type: 'Accessory', value: 'Gold Chain' },
    { trait_type: 'Rarity', value: 'Legendary' },
]

export const DUMMY_MEME_ATTRIBUTES: NFTAttribute[] = [
    { trait_type: 'Frame', value: 'Neon Glow' },
    { trait_type: 'Sticker', value: 'REKT Crown' },
    { trait_type: 'Top Text', value: 'When you REKT the market' },
    { trait_type: 'Bottom Text', value: "GM. We're still early." },
    { trait_type: 'Background Color', value: '#1a1a2e' },
    { trait_type: 'Filter', value: 'Vaporwave' },
    { trait_type: 'Rarity', value: 'Epic' },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface AttributesModalProps {
    nftType: 'PFP' | 'MEME'
    isOpen: boolean
    onClose: () => void
}

const TRAIT_ICONS: Record<string, string> = {
    Background: '🎨',
    'Background Color': '🎨',
    Skin: '✨',
    Eyes: '👁️',
    Mouth: '💬',
    Head: '👑',
    Outfit: '👔',
    Accessory: '📿',
    Rarity: '💎',
    Frame: '🖼️',
    Sticker: '🏷️',
    'Top Text': '📝',
    'Bottom Text': '📝',
    Filter: '🎞️',
}

export function AttributesModal({ nftType, isOpen, onClose }: AttributesModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null)
    const attributes = nftType === 'PFP' ? DUMMY_PFP_ATTRIBUTES : DUMMY_MEME_ATTRIBUTES

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-0.5">
                            {nftType} Collection
                        </p>
                        <h3 className="text-lg font-black text-white">NFT Attributes</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors text-sm font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Notice */}
                <div className="mx-5 mt-4 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                        🧪 <strong>Dummy attributes</strong> — these will be sent to the backend as NFT metadata traits.
                    </p>
                </div>

                {/* Attributes grid */}
                <div className="p-5 grid grid-cols-2 gap-2.5 max-h-80 overflow-y-auto">
                    {attributes.map((attr) => (
                        <div
                            key={attr.trait_type}
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col gap-1"
                        >
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                <span>{TRAIT_ICONS[attr.trait_type] ?? '🔹'}</span>
                                {attr.trait_type}
                            </span>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate" title={String(attr.value)}>
                                {attr.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-2xl font-black uppercase tracking-widest text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    )
}
