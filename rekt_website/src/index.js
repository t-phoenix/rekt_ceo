// eslint-disable-next-line
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider, QueryClientProvider, queryClient, config } from './config/walletConfig';
import NexusProvider from './components/nexus/NexusProvider';
import { Buffer } from 'buffer';
import process from 'process';
import { SolanaWalletProvider } from './config/SolanaWalletProvider';

window.Buffer = Buffer;
window.process = process;

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <NexusProvider>
          <SolanaWalletProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SolanaWalletProvider>
        </NexusProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
