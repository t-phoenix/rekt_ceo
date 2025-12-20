# REKT CEO - Memecoin Community turned movement

## 📁 Project Structure

### 🎯 **rekt_website** (Public Website)
React-based public-facing web application for REKT CEO NFT platform with PFP generation and minting functionality.

### 🛠️ **rekt_admin** (Admin Dashboard)
Vite + React + TypeScript admin dashboard with Ethereum wallet integration (wagmi/viem) for managing NFT minting operations.

### ⚙️ **rekt_backend** (Backend API)
Express.js + TypeScript backend server for Ethereum NFT operations on Base chain, featuring:
- SIWE (Sign-In with Ethereum) authentication
- Gasless NFT minting
- IPFS metadata storage via Pinata
- Redis-based rate limiting and caching
- JWT token authentication

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- pnpm or npm package manager
- Docker (for Redis in development)
- WalletConnect Project ID (for admin dashboard)

### Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/t-phoenix/rekt_ceo
cd rekt_ceo
```

2. **Public Website (rekt_website):**
```bash
cd rekt_website
yarn install
yarn start          # Development server on http://localhost:3000
```

3. **Admin Dashboard (rekt_admin):**
```bash
cd rekt_admin
pnpm install
# Update WalletConnect Project ID in src/config/wagmi.ts
pnpm dev            # Development server on http://localhost:5173
```

4. **Backend Server (rekt_backend):**
```bash
cd rekt_backend
pnpm install
# Copy .env.example to .env and configure
cp .env.example .env
# Start Redis with Docker
docker-compose up -d
# Start development server
pnpm dev            # Development server on http://localhost:3000
```

## 🔧 Key Dependencies

### Frontend (rekt_admin)
- **React**: ^19.2.0
- **Vite**: ^7.2.4
- **wagmi**: ^3.0.2
- **viem**: ^2.40.3
- **ethers**: ^6.15.0
- **SIWE**: ^3.0.0

### Backend (rekt_backend)
- **Express**: ^4.21.2
- **TypeScript**: ^5.9.3
- **ethers.js**: ^6.15.0
- **SIWE**: ^2.3.2
- **Pinata**: ^2.5.1
- **Redis** (ioredis): ^5.8.2
- **JWT**: jsonwebtoken ^9.0.2

### Website (rekt_website)
- **React**: ^18.2.0
- **React Scripts**: ^5.0.1

## 💡 Features
- Ethereum wallet integration (Base chain)
- SIWE (Sign-In with Ethereum) authentication
- Gasless NFT minting
- Dynamic PFP NFT generation
- IPFS metadata storage via Pinata
- Admin dashboard for minting operations
- Rate limiting and security middleware
- Redis caching for performance

## 🔐 Required API Keys & Configuration

### Backend Environment Variables
- **Alchemy RPC URL** - Base chain RPC endpoint
- **Pinata JWT** - IPFS storage authentication
- **Backend Private Key** - For executing minting transactions
- **JWT Secret** - For token generation
- **Smart Contract Addresses** - MinterContract, NFT Collections, CEO Token
- **Redis URL** - For caching and rate limiting

See [rekt_backend/README.md](./rekt_backend/README.md) for detailed configuration.

### Admin Dashboard
- **WalletConnect Project ID** - From https://cloud.walletconnect.com

## 📚 Documentation

- **[Backend README](./rekt_backend/README.md)** - Backend API documentation and setup
- **[Admin README](./rekt_admin/README.md)** - Admin dashboard setup and authentication flow