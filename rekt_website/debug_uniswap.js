import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({ chain: base, transport: http() });

const ROUTER = '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CEO = '0x296ad590f077614d951ccc630e763765d1Ef004f';
const FACTORY = '0x8909dc15e45db488ae571c0f9548f06790409cd0'; // BaseSwap Factory

async function debug() {
  console.log('Router:', ROUTER);
  try {
    const factory = await client.readContract({
      address: ROUTER,
      abi: parseAbi(['function factory() view returns (address)']),
      functionName: 'factory'
    });
    console.log('Factory from Router:', factory);
    
    const pair = await client.readContract({
      address: factory,
      abi: parseAbi(['function getPair(address,address) view returns (address)']),
      functionName: 'getPair',
      args: [USDC, CEO]
    });
    console.log('Pair:', pair);

    if (pair === '0x0000000000000000000000000000000000000000') {
      console.log('No pair found on this factory.');
      return;
    }

    const reserves = await client.readContract({
      address: pair,
      abi: parseAbi(['function getReserves() view returns (uint112, uint112, uint32)']),
      functionName: 'getReserves'
    });
    console.log('Reserves:', reserves);

    const totalSupply = await client.readContract({
      address: pair,
      abi: parseAbi(['function totalSupply() view returns (uint256)']),
      functionName: 'totalSupply'
    });
    console.log('Total Supply:', formatUnits(totalSupply, 18));
  } catch (e) {
    console.log('Error:', e);
  }
}
debug();
