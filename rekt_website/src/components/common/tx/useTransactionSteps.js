import { useMemo, useRef, useState } from "react";
import { getStepKey } from "./types";
import {
  computeAllCompleted,
  mergeStepComplete,
  mergeStepsList,
  seedSteps,
} from "./steps";

/**
 * Manages transaction steps with utilities to seed from expected steps,
 * replace the list on "steps list" events, and mark individual steps complete.
 */
export function useTransactionSteps(options = {}) {
  const { expected } = options;
  const [steps, setSteps] = useState(() =>
    expected ? seedSteps(expected) : []);
  const lastSignatureRef = useRef("");

  const onStepsList = (list) => {
    const signature = list.map((step) => getStepKey(step)).join("|");
    if (lastSignatureRef.current === signature) {
      setSteps((prev) => mergeStepsList(prev, list));
      return;
    }
    lastSignatureRef.current = signature;
    setSteps((prev) => mergeStepsList(prev, list));
  };

  const onStepComplete = (step) => {
    setSteps((prev) => mergeStepComplete(prev, step));
  };

  const seed = (expectedSteps) => {
    setSteps(seedSteps(expectedSteps));
  };

  const reset = () => {
    setSteps(expected ? seedSteps(expected) : []);
    lastSignatureRef.current = "";
  };

  const allCompleted = useMemo(() => computeAllCompleted(steps), [steps]);

  return {
    steps,
    allCompleted,
    onStepsList,
    onStepComplete,
    seed,
    reset,
  };
}
