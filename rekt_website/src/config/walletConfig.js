
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { base, mainnet, arbitrum, optimism, polygon, avalanche, bsc, scroll } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'


// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Get projectId from https://cloud.walletconnect.com
// TODO: Replace with your actual WalletConnect Project ID
export const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID_HERE'

if (!projectId) {
    console.warn('⚠️ WalletConnect Project ID is missing. Please add REACT_APP_WALLETCONNECT_PROJECT_ID to your .env file')
}

// 2. Create a metadata object - optional
const metadata = {
    name: 'REKT CEO',
    description: 'Be Your Own CEO - REKT CEO Meme Platform',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://rektceo.com', // Dynamically get current URL
    icons: ['https://www.rektceo.com/creatives/rekt.png'] // Use a known working highly available public image for testing
}

// 3. Set the networks
export const networks = [mainnet, base, arbitrum, optimism, polygon, avalanche, bsc, scroll]

// 4. Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
    networks,
    projectId,
    ssr: false
})

// 5. Create modal
export const modal = createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    features: {
        analytics: true, // Optional - defaults to your Cloud configuration
        email: false, // Disable email login
        socials: false, // Disable social logins
    },
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#D81E5B', // REKT CEO red color
        '--w3m-border-radius-master': '10px',
        '--w3m-font-family': 'Roboto, sans-serif' // Use local font to avoid unused preload warning for custom AppKit font
    }
})

// Export providers for wrapping the app
export { WagmiProvider, QueryClientProvider, queryClient }
export const config = wagmiAdapter.wagmiConfig
