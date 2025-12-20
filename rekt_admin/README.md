# REKT Admin

A simple admin dashboard with WalletConnect integration.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Get your WalletConnect Project ID:
   - Go to https://cloud.walletconnect.com
   - Create a new project
   - Copy the Project ID

3. Update the Project ID in `src/config/wagmi.ts`:
```typescript
export const projectId = 'YOUR_PROJECT_ID'
```

## Development

Run the development server:
```bash
pnpm dev
```

# Authentication Flow

## How It Works

### 1. **App Launch**
- Checks backend health via `GET /api/health`
- Shows status indicator

### 2. **Wallet Connection**
- User clicks "Connect Wallet"
- Web3Modal opens, user selects wallet
- Wallet connects via wagmi

### 3. **Authentication (Auto-triggered)**
When wallet connects:

1. **Get Nonce**
   - Frontend → Backend: `POST /api/auth/nonce` with wallet address
   - Backend generates random nonce
   - Backend stores nonce in Redis (5 min expiry)
   - Backend → Frontend: Returns nonce

2. **Create & Sign Message**
   - Frontend creates SIWE (Sign-In with Ethereum) message with nonce
   - User signs message in wallet
   - Frontend has: message + signature

3. **Verify & Get Token**
   - Frontend → Backend: `POST /api/auth/verify` with message + signature
   - Backend verifies signature matches address
   - Backend checks nonce is valid (not expired/reused)
   - Backend deletes nonce (single-use)
   - Backend generates JWT token
   - Backend → Frontend: Returns JWT token

4. **Store Token**
   - Frontend stores JWT in localStorage
   - Token used for authenticated API calls

