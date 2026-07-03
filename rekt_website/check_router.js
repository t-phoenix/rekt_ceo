import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http()
});

const ROUTER = '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24';

async function check() {
  console.log('Checking Router:', ROUTER);
  
  // Check factory()
  try {
    const factory = await client.readContract({
      address: ROUTER,
      abi: parseAbi(['function factory() view returns (address)']),
      functionName: 'factory'
    });
    console.log('Factory:', factory);
  } catch (e) {
    console.log('Error fetching factory():', e.message.split('
')[0]);
  }

  // Check generic bytecode or assume based on factory failure
}

check();
