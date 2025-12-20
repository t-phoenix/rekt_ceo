import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'

// Get projectId from https://cloud.walletconnect.com
export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

const alchemyApiKey = import.meta.env.VITE_ALCHEMY_API_KEY
if (!projectId) {
  throw new Error('WalletConnect Project ID is not defined. Please set VITE_WALLETCONNECT_PROJECT_ID in your .env file')
}

// Define metadata for Web3Modal
export const metadata = {
  name: 'REKT Admin',
  description: 'REKT Admin Dashboard',
  url: 'https://rekt-admin.com', // Update with your actual URL
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// Create wagmiConfig
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    walletConnect({ 
      projectId, 
      metadata,
      showQrModal: false // We'll use Web3Modal's UI
    }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: metadata.name,
    }),
  ],
  transports: {
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
  },
})

