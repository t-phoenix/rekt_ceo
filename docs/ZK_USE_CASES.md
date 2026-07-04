# ZK Use Cases for REKT (zkArb SDK)

This document lists ways REKT can use zero-knowledge (ZK) proofs with the
zkArb SDK (https://jatinsahijwani.github.io/zkArb-sdk/). A ZK proof lets a user
prove something is true WITHOUT revealing the private details behind it.

## 1. Age gate for token sales
A user proves they are 18 or older before joining a token sale, without
revealing their actual age.

## 2. Holder-only perks
A user proves they hold at least a certain number of REKT tokens to unlock
member perks, without revealing their exact balance.

## 3. Anti-bot / one-person-one-entry for Launch Hub campaigns
A user proves they are a unique, eligible participant in XP campaigns and
giveaways, helping reduce bots and duplicate entries — without exposing
personal identity.

## 4. Private allowlist
A user proves they are on an approved list (e.g. early supporters) without
revealing who else is on the list or their position on it.

## 5. Private community badges
A user proves they earned a status (e.g. completed a quest) and shows a badge,
without revealing the underlying account data.

## How these are built
Each use case is a small "circuit" compiled and deployed with the zkArb SDK,
then checked with a single verifyProof(...) call. See the zk-integration folder
for examples.

## Learn more
- zkArb SDK docs: https://jatinsahijwani.github.io/zkArb-sdk/
- zkArb SDK repo: https://github.com/jatinsahijwani/zkArb-sdk
