# zkArb SDK Integration

This folder contains the zero-knowledge (ZK) integration for REKT, built with the
zkArb SDK: https://jatinsahijwani.github.io/zkArb-sdk/

## What it does

The zkArb SDK lets REKT verify facts about a user without seeing the user's
private data. For example, a user can prove they are old enough for a token sale,
or that they hold enough REKT tokens for a perk, without revealing their age or
exact balance.

## How it works (high level)

1. Write a circuit — a small file describing what to prove (see the circuits folder).
2. Compile it — npx zkarb-sdk compile ./circuits/yourCircuit.circom
3. Deploy the verifier — npx zkarb-sdk deploy ./yourCircuit <PRIVATE_KEY>
   deploys a verifier contract to Arbitrum.
4. Verify a proof — call verifyProof(input, "./yourCircuit") from JavaScript
   to generate a proof and check it on-chain.

## Folder contents

- circuits/ — the ZK circuits used by REKT (e.g. age gate, holder badge).
- examples/ — reference scripts showing how to verify proofs.

## Learn more

- zkArb SDK docs: https://jatinsahijwani.github.io/zkArb-sdk/
- zkArb SDK repo: https://github.com/jatinsahijwani/zkArb-sdk
