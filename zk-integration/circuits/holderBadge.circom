pragma circom 2.0.0;

// Holder Badge circuit for the REKT zkArb SDK integration.
// Proves a user holds at least 1,000,000 REKT tokens WITHOUT revealing
// their actual balance. Useful for member-only / gated community perks.
//
// Note: "balance" here is a whole number of tokens (not wei).
//
// Private input : balance    (kept secret)
// Public output : qualifies  (1 if balance >= 1,000,000, otherwise 0)

include "comparators.circom";

template HolderBadge() {
    signal input balance;      // private: the user's token balance (never revealed)
    signal output qualifies;   // public: 1 if they hold enough, else 0

    // GreaterEqThan(32) compares whole numbers up to ~4 billion.
    component check = GreaterEqThan(32);
    check.in[0] <== balance;        // the user's balance
    check.in[1] <== 1000000;        // the minimum required to qualify

    qualifies <== check.out;        // result becomes the public output
}

component main = HolderBadge();
