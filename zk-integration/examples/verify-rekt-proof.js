// Example: verifying a zero-knowledge proof in REKT using the zkArb SDK.
//
// This is a reference example for other developers. It shows how REKT would
// check that a user holds enough REKT tokens (using the "holderBadge" circuit)
// WITHOUT ever seeing the user's actual balance.
//
// Docs: https://jatinsahijwani.github.io/zkArb-sdk/

const { verifyProof } = require("zkarb-sdk");

async function main() {
  // The private input the user proves something about (kept secret).
  const input = { balance: "1500000" };

  // Path to the compiled circuit folder produced by `npx zkarb-sdk compile`.
  const circuitPath = "./holderBadge";

  // Generate the proof and verify it on Arbitrum in a single call.
  const result = await verifyProof(input, circuitPath);

  console.log("Public output:", result.publicSignals); // e.g. [ '1' ] = qualifies
  console.log("Full result:", result);
}

main().catch((err) => {
  console.error("Verification example failed:", err);
});
