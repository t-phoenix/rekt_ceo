import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

function setupWallet() {
  const base64Wallet = process.env.AGENTCASH_WALLET_BASE64;
  
  if (!base64Wallet) {
    console.log('⚠️  No AGENTCASH_WALLET_BASE64 found in env. Assuming local wallet or no wallet needed.');
    return;
  }

  const agentCashDir = path.join(os.homedir(), '.agentcash');
  const walletPath = path.join(agentCashDir, 'wallet.json');

  if (!fs.existsSync(agentCashDir)) {
    fs.mkdirSync(agentCashDir, { recursive: true });
  }

  try {
    const walletJson = Buffer.from(base64Wallet, 'base64').toString('utf8');
    // Basic validation
    JSON.parse(walletJson); 
    
    fs.writeFileSync(walletPath, walletJson, { mode: 0o600 });
    console.log(`✅ AgentCash wallet successfully written to ${walletPath}`);
  } catch (err) {
    console.error('❌ Failed to decode or write AGENTCASH_WALLET_BASE64:', err.message);
    process.exit(1);
  }
}

setupWallet();
