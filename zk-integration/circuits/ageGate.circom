pragma circom 2.0.0;

// Age Gate circuit for the REKT zkArb SDK integration.
// Proves a user is 18 or older WITHOUT revealing their real age.
//
// Private input : age      (kept secret)
// Public output : isAdult  (1 if age >= 18, otherwise 0)

include "comparators.circom";

template AgeGate() {
    signal input age;        // private: the user's real age (never revealed)
    signal output isAdult;   // public: 1 if 18 or older, else 0

    // GreaterEqThan(8) compares numbers up to 255 (plenty for an age).
    component check = GreaterEqThan(8);
    check.in[0] <== age;     // the user's age
    check.in[1] <== 18;      // the minimum age

    isAdult <== check.out;   // result becomes the public output
}

component main = AgeGate();
