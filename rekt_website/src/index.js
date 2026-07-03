// eslint-disable-next-line
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { WagmiProvider, QueryClientProvider, queryClient, config } from './config/walletConfig';
import NexusProvider from './components/nexus/NexusProvider';
import { Buffer } from 'buffer';
import process from 'process';

window.Buffer = Buffer;
window.process = process;

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <NexusProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </NexusProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </HelmetProvider>
  </React.StrictMode>
);
