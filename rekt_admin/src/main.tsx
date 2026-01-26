import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { config, projectId, metadata } from './config/wagmi'
import './index.css'
import { ThemeProvider } from './context/ThemeContext'
import App from './App.tsx'

const queryClient = new QueryClient()

// Create Web3Modal
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  metadata,
  enableAnalytics: false,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
