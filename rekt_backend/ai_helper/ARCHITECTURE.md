# Rekt CEO Backend Architecture

## System Overview

The Rekt CEO backend is a minimal Node.js/TypeScript middleware that bridges the frontend and smart contracts to enable gasless NFT minting. Users sign messages but never send transactions—the backend handles all blockchain interactions.

**Key Components:**
- **User's Wallet**: Holds CEO tokens, signs messages (SIWE auth + EIP-2612 permit)
- **Backend Wallet**: Has APPROVER_ROLE, executes mints, pays gas
- **Smart Contracts**: MinterContract (orchestrates), NFTCollection (mints), CEOToken (payment)
- **Storage**: IPFS via Pinata for images and metadata

---

## The Two-Key Architecture Explained

### User's Wallet (Signs, Doesn't Pay Gas)

**What it does:**
1. Signs SIWE message → Proves ownership of wallet address (authentication)
2. Signs EIP-2612 permit → Authorizes MinterContract to spend CEO tokens (payment authorization)
3. Receives the NFT in their wallet after minting

**What it DOESN'T do:**
- ❌ Doesn't send any blockchain transactions
- ❌ Doesn't pay gas fees
- ❌ Doesn't need ETH in wallet (only CEO tokens)

**Technical Details:**
```javascript
// Step 1: User signs SIWE message (free, off-chain)
const siweMessage = {
  domain: 'rektceo.club',
  address: userAddress,
  statement: 'Sign in to Rekt CEO',
  nonce: serverNonce
};
const authSignature = await wallet.signMessage(siweMessage);

// Step 2: User signs EIP-2612 permit (free, off-chain)
const permitSignature = await signTypedData({
  types: { Permit: [...] },
  domain: { name: 'Rekt CEO', ... },
  message: {
    owner: userAddress,
    spender: minterContractAddress,
    value: ceoTokenAmount,
    deadline: timestamp + 3600
  }
});
// Result: { v, r, s } signature components
```

### Backend Wallet (Executes, Pays Gas)

**What it does:**
1. Stores private key securely (environment variable)
2. Has `APPROVER_ROLE` granted in MinterContract
3. Calls `mintNFTWithPermit()` on MinterContract
4. Pays gas for the transaction (~$5-20 on Base)

**What it DOESN'T do:**
- ❌ Doesn't own CEO tokens (users provide via permit)
- ❌ Doesn't require user funds

**Technical Details:**
```javascript
// Backend wallet setup
const backendWallet = new ethers.Wallet(
  process.env.BACKEND_PRIVATE_KEY,
  provider
);

// Backend executes mint (pays gas)
const tx = await minterContract
  .connect(backendWallet)
  .mintNFTWithPermit(
    NFTType.PFP,              // 0 for PFP, 1 for MEME
    ipfsMetadataURI,          // "ipfs://Qm..."
    {                         // User's permit signature
      owner: userAddress,
      spender: minterAddress,
      value: ceoAmount,
      deadline: deadline,
      v: permitSig.v,
      r: permitSig.r,
      s: permitSig.s
    }
  );

await tx.wait(); // Wait for confirmation
```

### Why Two Keys?

**Security:**
- User never gives up custody of CEO tokens
- User can revoke permit before deadline expires
- Backend can't steal user funds (permit is one-time, specific amount)

**UX:**
- User experience is completely gasless
- No need for users to hold ETH
- No waiting for wallet popups during minting

**Operational:**
- Backend controls timing (prevents race conditions)
- Backend validates before spending gas
- Backend can batch or optimize gas usage

---

## Complete User Flow

### Step 1: Authentication (SIWE)
```
User → Frontend → Backend
1. User clicks "Connect Wallet"
2. Frontend requests nonce: GET /api/auth/nonce { address }
3. Backend generates unique nonce, returns it
4. Frontend creates SIWE message with nonce
5. User signs message in wallet (free)
6. Frontend sends: POST /api/auth/verify { message, signature }
7. Backend verifies signature matches address
8. Backend returns JWT token (24hr expiry)
9. Frontend stores JWT, uses for all API calls
```

**Purpose:** Prove the user owns the wallet address. This is NOT for minting—just authentication.

### Step 2: Check Eligibility
```
Frontend → Backend → Smart Contract
1. Frontend calls: GET /api/info/user/:address
2. Backend queries MinterContract:
   - getUserMintCount(address, NFTType.PFP) → returns 0-2
   - canUserMint(address, NFTType.PFP) → returns true/false
3. Backend returns: { pfpMintCount: 1, canMint: true, maxMint: 2 }
4. Frontend shows "You can mint 1 more PFP"
```

### Step 3: Get Pricing
```
Frontend → Backend → Smart Contract
1. Frontend calls: GET /api/info/pricing/PFP
2. Backend queries MinterContract.getCurrentTierInfo(NFTType.PFP)
3. Smart contract returns:
   - currentSupply: 123
   - tierId: 1
   - priceUSD: 50000000 (50 USDC, 6 decimals)
   - priceCEO: 88183421516754176610 (~88.18 CEO tokens)
   - remainingInTier: 377
4. Frontend displays: "$50 USD (88.18 CEO tokens)"
```

### Step 4: User Designs NFT
```
User → Frontend
1. User creates PFP or Meme design
2. Frontend encodes image as base64
3. Frontend validates: max 10MB, PNG/JPG/GIF/WEBP
```

### Step 5: Sign Permit
```
User → Frontend
1. Frontend prompts: "Sign to authorize CEO token spending"
2. User signs EIP-2612 permit in wallet:
   - owner: user's address
   - spender: MinterContract address
   - value: 88183421516754176610 (exact CEO amount needed)
   - deadline: now + 1 hour
3. Wallet returns { v, r, s } signature (free, no gas)
4. Frontend now has: imageData + permitSignature
```

**Important:** This does NOT transfer tokens yet—just creates authorization.

### Step 6: Submit Mint Request
```
Frontend → Backend
POST /api/mint/initiate
Headers: { Authorization: "Bearer <jwt>" }
Body: {
  nftType: "PFP",
  imageData: "data:image/png;base64,iVBORw0KGgo...",
  permitSignature: {
    owner: "0x123...",
    spender: "0xMinter...",
    value: "88183421516754176610",
    deadline: 1704182400,
    v: 27,
    r: "0xabc...",
    s: "0xdef..."
  }
}

Backend responds immediately:
{
  success: true,
  message: "Minting in progress",
  estimatedTime: 45
}
```

### Step 7: Backend Processing (User Waits)
```
Backend Internal Process:
1. Validate JWT token → Extract user address
2. Verify user hasn't exceeded mint limit
3. Validate permit signature components
4. Decode and validate image (size, format, dimensions)

5. Upload to IPFS:
   - Upload image → get imageURI "ipfs://QmImage123..."
   - Generate metadata JSON:
     {
       "name": "Rekt CEO PFP #124",
       "description": "Rekt CEO Collection",
       "image": "ipfs://QmImage123...",
       "attributes": [...],
       "created_by": "0x123..."
     }
   - Upload metadata → get metadataURI "ipfs://QmMeta456..."

6. Execute blockchain transaction:
   - Call mintNFTWithPermit() with backend wallet
   - Contract executes permit (approves spending)
   - Contract transfers CEO tokens from user to treasury
   - Contract mints NFT to user's address
   - Contract optionally swaps 50% CEO → USDC

7. Wait for confirmation (2 blocks)
8. Parse event logs to get tokenId
9. Return success response
```

**Time:** Typically 30-60 seconds total

### Step 8: User Receives NFT
```
Backend → Frontend → User
1. Backend returns:
   {
     success: true,
     txHash: "0xtx123...",
     tokenId: 124,
     imageURI: "ipfs://QmImage...",
     metadataURI: "ipfs://QmMeta..."
   }

2. Frontend displays: "Success! PFP #124 minted"
3. User sees NFT in wallet immediately
4. User's CEO token balance decreased by 88.18
5. User received NFT #124 in wallet
```

---

## Smart Contract Integration Points

### MinterContract (Main Orchestrator)

**Address:** Set in `MINTER_CONTRACT_ADDRESS` env var

**Key Functions We Call:**

1. **getCurrentTierInfo(NFTType) → view**
   ```solidity
   Returns: (currentSupply, tierId, priceUSD, priceCEO, remainingInTier)
   ```
   - Used to show pricing to user
   - Called frequently (cache for 30s)

2. **canUserMint(address, NFTType) → view**
   ```solidity
   Returns: bool (true if user can mint more)
   ```
   - Checks if user reached mint limit
   - PFP: max 2 per user
   - MEME: max 9 per user

3. **getUserMintCount(address, NFTType) → view**
   ```solidity
   Returns: uint256 (number of mints)
   ```
   - Shows how many user has minted

4. **queryCEOPriceFromDEX() → view**
   ```solidity
   Returns: uint256 (CEO price in USDC, 6 decimals)
   ```
   - Queries Uniswap for current CEO price
   - Example: 567000 = $0.567 per CEO

5. **mintNFTWithPermit(NFTType, metadataURI, PermitData) → payable**
   ```solidity
   Requires: APPROVER_ROLE
   - Executes user's permit signature
   - Transfers CEO tokens from user
   - Mints NFT to user
   - Emits NFTPurchased event
   ```
   - **This is the critical function—only backend can call it**

### NFTCollection (PFP and MEME)

**Addresses:** `PFP_COLLECTION_ADDRESS` and `MEME_COLLECTION_ADDRESS`

**Functions (called by MinterContract, not directly by us):**

1. **mintForUser(address, metadataURI)**
   - Mints NFT to user's address
   - Sets token URI
   - Increments user's mint count
   - Only callable by MinterContract (has MINTER_ROLE)

2. **getCurrentTokenId() → view**
   - Returns next token ID to be minted
   - Used to determine current supply

### CEOToken (Payment Token)

**Address:** `CEO_TOKEN_ADDRESS`

**Functions:**

1. **permit(owner, spender, value, deadline, v, r, s)**
   - EIP-2612 permit function
   - Called by MinterContract (not by us directly)
   - Validates user's signature
   - Approves spending

2. **balanceOf(address) → view**
   - Check if user has enough tokens (optional frontend check)

---

## Cost & Operational Model

### What User Pays

**CEO Tokens Only** (via permit signature, gasless):
- PFP Tier 1: ~88 CEO ($50 USD equivalent)
- PFP Tier 2: ~264 CEO ($150 USD equivalent)
- PFP Tier 3: ~441 CEO ($250 USD equivalent)
- MEME Tier 1: ~9 CEO ($5 USD equivalent)
- MEME Tier 2: ~26 CEO ($15 USD equivalent)
- MEME Tier 3: ~44 CEO ($25 USD equivalent)

**User Experience:**
- ✅ No gas fees
- ✅ No ETH needed in wallet
- ✅ Just sign two messages (SIWE + permit)
- ✅ Completely gasless from user perspective

### What Backend Pays

**Gas Fees Only:**
- Mint transaction: ~300k-440k gas
- On Base (low gas): ~$5-10 per mint
- On Ethereum (high gas): ~$50-200 per mint
- On BSC (low gas): ~$1-5 per mint

**Backend Wallet Management:**
- Must maintain ETH balance for gas
- Alert when balance < 0.1 ETH
- Estimated: 0.01-0.05 ETH per mint depending on network
- Budget: ~$100-500 in ETH for 100 mints

### Revenue Model (Optional)

**Current Setup:** Backend pays gas, users pay exact NFT price
**Possible Enhancements:**
1. Add 5-10% service fee on top of NFT price
2. Process mints during low gas periods (batch overnight)
3. Premium tier: instant minting for higher fee
4. Sponsor gas for first-time users (marketing)

### Where Funds Go

1. **User's CEO tokens** → MinterContract
2. **MinterContract** → Splits funds:
   - 50% CEO tokens → Treasury (as CEO)
   - 50% CEO tokens → Swapped to USDC → Treasury (if swap enabled)
3. **Admin can withdraw** accumulated funds to treasury wallet

---

## Security Considerations

### Backend Wallet Security

**Private Key Storage:**
```bash
# Environment variable (NEVER commit to git)
BACKEND_PRIVATE_KEY=0x1234...

# Production: Use secrets manager
# AWS Secrets Manager, HashiCorp Vault, or similar
```

**Access Control:**
- Backend wallet has ONLY `APPROVER_ROLE`
- Does NOT have `ADMIN_ROLE` (can't change contract settings)
- Can only call `mintNFTWithPermit()` and view functions
- Limited blast radius if compromised

**Monitoring:**
```javascript
// Alert if balance low
if (await backendWallet.getBalance() < ethers.parseEther("0.1")) {
  alertOps("Backend wallet needs ETH refill");
}

// Alert on suspicious activity
if (mintsInLastHour > 1000) {
  alertOps("Unusual minting volume detected");
}
```

**Key Rotation:**
- Plan for regular key rotation (quarterly)
- Have backup wallet ready with APPROVER_ROLE
- Document rotation procedure

### SIWE Authentication

**What It Protects:**
- ✅ Proves user owns the wallet address
- ✅ Prevents impersonation attacks
- ✅ Enables rate limiting per user
- ✅ Prevents unauthorized API access

**What It Doesn't Protect:**
- ❌ Doesn't prevent user from minting invalid images
- ❌ Doesn't validate token balances (contract does this)
- ❌ Doesn't prevent race conditions (queue does this)

**Implementation:**
```javascript
// Nonce must be:
- Unique per user
- Single-use (regenerate after successful login)
- Expire after 5 minutes
- Stored in Redis with TTL

// JWT must be:
- Short-lived (24 hours max)
- Include wallet address
- Signed with secret key
- Validated on every protected endpoint
```

### Permit Signature Validation

**Backend Validates:**
```javascript
// Before accepting mint request
1. Permit deadline > now (not expired)
2. Permit spender === MinterContract address
3. Permit value >= current mint price
4. Permit owner === authenticated user address
5. Signature components valid (v = 27 or 28, r/s are 32 bytes)
```

**Smart Contract Validates:**
```solidity
// MinterContract.mintNFTWithPermit()
1. Executes permit (will revert if signature invalid)
2. Checks user's CEO token balance (will revert if insufficient)
3. Checks user's mint limit (will revert if exceeded)
4. Checks supply limit (will revert if sold out)
```

**Double Validation:** Backend pre-checks prevent wasting gas, contract enforces final rules.

### Rate Limiting

**Prevents:**
- DDoS attacks
- Gas drainage attacks (malicious minting)
- API abuse

**Limits:**
```javascript
// Auth endpoints: 10 requests/min per IP
// Mint endpoints: 3 requests/min per user, 10/min per IP
// Info endpoints: 60 requests/min per IP
// Use Redis for distributed rate limiting
```

### Input Validation

**Image Validation:**
```javascript
// Before processing
- Max size: 10MB
- Allowed formats: PNG, JPG, JPEG, GIF, WEBP
- Min dimensions: 500x500px
- Max dimensions: 4096x4096px
- Validate magic bytes (not just extension)
```

**Address Validation:**
```javascript
// All Ethereum addresses
ethers.isAddress(address) === true
ethers.getAddress(address) // Checksum
```

**Signature Validation:**
```javascript
// Permit signature
v === 27 || v === 28
r.length === 66 (0x + 64 hex chars)
s.length === 66
```

---

## Why Minimal Architecture?

### Design Philosophy

**Principle:** Use smart contracts as the source of truth, not a database.

**Benefits:**
1. **Simpler codebase** → Easier to maintain, fewer bugs
2. **No sync issues** → Contract state is always accurate
3. **Stateless backend** → Easy to scale horizontally
4. **Faster development** → No database migrations, no ORM complexity
5. **Lower costs** → No database hosting, no backup management

### What We Eliminated

**❌ PostgreSQL Database**
- **Why removed:** Contract already tracks mint counts, token IDs, and eligibility
- **Trade-off:** Slightly slower queries (RPC call vs DB query)
- **Mitigation:** Cache results in Redis for 30-60 seconds

**❌ BullMQ Job Queues**
- **Why removed:** Expected load < 100 mints/hour, simple queue sufficient
- **Trade-off:** Less robust retry logic, no job monitoring UI
- **Mitigation:** In-memory queue with basic retry, log all errors

**❌ User Models/Sessions**
- **Why removed:** Wallet address is the identity, JWT is the session
- **Trade-off:** Can't store user preferences
- **Mitigation:** Use contract events or frontend local storage

### What We Kept

**✅ Redis (Minimal)**
- **Why:** Distributed rate limiting, price caching
- **Usage:** 
  - Cache CEO price (60s TTL)
  - Cache tier info (30s TTL)
  - Rate limit counters (1min windows)
  - SIWE nonces (5min TTL)

**✅ Simple In-Memory Queue**
- **Why:** Serialize mint operations, prevent race conditions
- **Usage:**
  - Queue mint requests
  - Process one at a time per user
  - Basic retry on transient failures (RPC timeout)

**✅ IPFS (Pinata)**
- **Why:** Decentralized storage is requirement for NFTs
- **Usage:** Store images and metadata permanently

### Performance Expectations

**Expected Load:**
- 10-100 mints per hour (peak)
- 1-10 concurrent users
- 99% uptime acceptable (non-critical)

**Response Times:**
- Auth: < 200ms
- Pricing/Info: < 500ms
- Mint initiate: < 200ms (accepts request)
- Mint complete: 30-60s (actual processing)

**Scalability:**
- Current setup handles 100 mints/hour easily
- For 1000+ mints/hour: Add BullMQ, add more workers
- Horizontal scaling: Stateless design allows multiple instances

### When to Add Complexity

**Add PostgreSQL when:**
- Need to track user preferences/profiles
- Need complex analytics/reporting
- Need to store off-chain data (social media links, bios)
- Want faster queries than RPC can provide

**Add BullMQ when:**
- Processing > 500 mints/hour
- Need sophisticated retry logic
- Want job monitoring UI
- Need job prioritization

**For now:** Keep it simple. Add complexity only when needed.

---

## Operations Manual

### Backend Wallet Funding

**Check Balance:**
```bash
# Get backend wallet address
BACKEND_ADDRESS=$(cast wallet address --private-key $BACKEND_PRIVATE_KEY)

# Check ETH balance
cast balance $BACKEND_ADDRESS --rpc-url $RPC_URL
```

**Fund Wallet:**
```bash
# Transfer 1 ETH from admin wallet
cast send $BACKEND_ADDRESS --value 1ether --private-key $ADMIN_KEY --rpc-url $RPC_URL
```

**Set Up Alerts:**
- Monitor balance every hour
- Alert if < 0.1 ETH
- Auto-fund from treasury if < 0.05 ETH (optional)

### Monitoring Checklist

**Daily:**
- [ ] Backend wallet has ETH (> 0.1)
- [ ] No errors in logs
- [ ] API responding (health check)
- [ ] Redis operational

**Weekly:**
- [ ] Review error patterns
- [ ] Check IPFS pin status
- [ ] Verify mint success rate > 95%

**Monthly:**
- [ ] Rotate API keys (Pinata, Alchemy)
- [ ] Review and archive logs
- [ ] Update dependencies

### Emergency Procedures

**Backend Wallet Compromised:**
1. Deploy new wallet with fresh private key
2. Grant APPROVER_ROLE to new wallet
3. Revoke APPROVER_ROLE from old wallet
4. Update BACKEND_PRIVATE_KEY in environment
5. Restart backend

**IPFS Upload Failing:**
1. Check Pinata dashboard for issues
2. Verify API keys valid
3. Check rate limits
4. Fallback: Use alternative gateway (NFT.Storage, Web3.Storage)

**Contract Sold Out:**
1. Normal operation—all NFTs minted
2. Update frontend to show "Sold Out"
3. Backend will reject new mints (contract reverts)

**Gas Prices Too High:**
1. Monitor gas price before minting
2. If > threshold, queue and wait
3. Process during low gas periods
4. Consider alternative chains

---

## Quick Reference

### Contract Addresses (Update for your deployment)

```bash
# Smart Contracts
MINTER_CONTRACT_ADDRESS=0x...
PFP_COLLECTION_ADDRESS=0x...
MEME_COLLECTION_ADDRESS=0x...
CEO_TOKEN_ADDRESS=0x...

# Backend Wallet (has APPROVER_ROLE)
BACKEND_WALLET_ADDRESS=0x...
```

### Key Endpoints

```bash
# Authentication
POST /api/auth/nonce { address }
POST /api/auth/verify { message, signature }

# Information
GET /api/info/pricing/:nftType
GET /api/info/user/:address
GET /api/info/ceo-price

# Minting
POST /api/mint/initiate { nftType, imageData, permitSignature }

# Health
GET /api/health
```

### Environment Variables

```bash
# Blockchain
CHAIN_ID=8453
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
BACKEND_PRIVATE_KEY=0x...

# Contract Addresses
MINTER_CONTRACT_ADDRESS=0x...
PFP_COLLECTION_ADDRESS=0x...
MEME_COLLECTION_ADDRESS=0x...
CEO_TOKEN_ADDRESS=0x...

# IPFS
PINATA_JWT=eyJ...
PINATA_GATEWAY=https://gateway.pinata.cloud

# API
PORT=3000
NODE_ENV=production
JWT_SECRET=...
CORS_ORIGIN=https://rektceo.club

# Redis
REDIS_URL=redis://localhost:6379
```

### Testing Locally

```bash
# 1. Start Hardhat node with contracts
cd ../
npx hardhat node

# 2. Deploy contracts and note addresses
npx hardhat run scripts/deploy.js --network localhost

# 3. Grant APPROVER_ROLE to backend wallet
npx hardhat run scripts/grant-role.js --network localhost

# 4. Start Redis
docker run -d -p 6379:6379 redis:alpine

# 5. Start backend
cd backend
npm run dev

# 6. Test auth
curl -X POST http://localhost:3000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address":"0x..."}'
```

---

## Summary

**What makes this architecture work:**

1. **Two-key design** separates concerns: users authorize payment, backend executes
2. **SIWE authentication** proves wallet ownership without blockchain transactions
3. **EIP-2612 permits** enable gasless token spending authorization
4. **Backend wallet** pays gas, making UX completely gasless for users
5. **Minimal design** uses contracts as source of truth, eliminating unnecessary complexity
6. **Security layers** validate at backend (save gas) and contract (enforce rules)

**User experience:**
- Connect wallet → Sign message → Upload image → Sign permit → Receive NFT
- Zero gas fees, zero ETH needed, just CEO tokens

**Backend responsibility:**
- Authenticate users, validate inputs, upload to IPFS, execute mints, pay gas

**Smart contract responsibility:**
- Enforce mint limits, validate permits, transfer tokens, mint NFTs, track state

This architecture provides a gasless, secure, and maintainable solution for NFT minting at scale.

