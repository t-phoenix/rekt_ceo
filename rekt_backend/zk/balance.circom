pragma circom 2.1.6;

include "comparators.circom";

template BalanceThresholdProof() {

    signal input balance;
    signal input minBalance;

    signal output isEligible;

    component gte = GreaterEqThan(252);

    gte.in[0] <== balance;
    gte.in[1] <== minBalance;

    isEligible <== gte.out;
}

component main { public [minBalance] } = BalanceThresholdProof();