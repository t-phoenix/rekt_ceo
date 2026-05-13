import { verifyProof } from "zkarb-sdk"
import { ethers } from "ethers"

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
]

export async function verifyHolderCampaign({
  wallet,
  minBalance,
}: {
  wallet: string
  minBalance: string
}) {

  // Create provider
  const provider = new ethers.JsonRpcProvider(
    "https://ethereum-sepolia-rpc.publicnode.com"
  )
  
  // ERC20 contract
  const token = new ethers.Contract(
    process.env.CEO_TOKEN_ADDRESS,
    ERC20_ABI,
    provider
  )

  // Fetch real balance
  const balance = await token.balanceOf(wallet)

  // IMPORTANT:
  // Only pass signals expected by circuit
  const circuitInput = {
    balance: balance.toString(),
    minBalance
  }

  console.log("Circuit Input:")
  console.log(circuitInput)

  // Generate + verify zk proof
  const result = await verifyProof(
    {
      balance : balance.toString(), minBalance : minBalance.toString()
    },
    "./zk/balance"
  )

  console.log("Proof Result:")
  console.log(result)

  // publicSignals format:
  // [ minBalance, isEligible ]
  const publicSignals =
    result.publicSignals || []

  const eligible =
    publicSignals[0] === "1"

  return {
    valid: true,
    eligible,
    publicSignals,
    balance: balance.toString()
  }
}