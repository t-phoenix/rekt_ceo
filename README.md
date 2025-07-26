# REKT CEO - Solana NFT Platform

## 📁 Project Structure

### 🎯 **rekt_website** (Current Working Folder)
React-based web application for REKT CEO NFT platform with PFP generation and minting functionality.

### rekt_app
Next.js application for Solana NFT minting (legacy/experimental).

### rekt_backend
Express.js backend server for Solana NFT operations and Pinata IPFS integration. (legacy/experimental/inspirational)

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Yarn package manager

### Installation & Setup

1. **Clone and install dependencies:**
```bash
git clone https://github.com/t-phoenix/rekt_ceo
cd rekt_ceo
```

2. **Main Application (rekt_website):**
```bash
cd rekt_website
yarn install
yarn start          # Development server on http://localhost:3000
```

3. **Next.js App (rekt_app):**
```bash
cd rekt_app
yarn install
yarn dev            # Development server on http://localhost:3000
```

4. **Backend Server (rekt_backend):**
```bash
cd rekt_backend
yarn install
yarn dev            # Development server with nodemon
```

## 🔧 Key Dependencies
- **Solana Web3.js**: ^1.98.0
- **Metaplex UMI**: ^0.9.2
- **Wallet Adapters**: Latest compatible versions
- **React**: ^18.2.0 (website) / ^19.0.0 (app)
- **Next.js**: 15.1.3

## 💡 Features
- Solana wallet integration
- Dynamic PFP NFT generation
- IPFS metadata storage via Pinata
- Candy Machine v3 minting