import { getStepKey } from "./types";

/**
 * Predefined expected steps for swaps to seed UI before events arrive.
 * Kept here to avoid duplication across exact-in and exact-out hooks.
 */
export const SWAP_EXPECTED_STEPS = [
  {
    type: "SWAP_START",
    typeID: "SWAP_START"
  },
  {
    type: "DETERMINING_SWAP",
    typeID: "DETERMINING_SWAP"
  },
  {
    type: "CREATE_PERMIT_FOR_SOURCE_SWAP",

    typeID:
      "CREATE_PERMIT_FOR_SOURCE_SWAP"
  },
  {
    type: "SOURCE_SWAP_BATCH_TX",
    typeID: "SOURCE_SWAP_BATCH_TX"
  },
  {
    type: "SOURCE_SWAP_HASH",
    typeID: "SOURCE_SWAP_HASH"
  },
  {
    type: "RFF_ID",
    typeID: "RFF_ID"
  },
  {
    type: "DESTINATION_SWAP_BATCH_TX",
    typeID: "DESTINATION_SWAP_BATCH_TX"
  },
  {
    type: "DESTINATION_SWAP_HASH",
    typeID: "DESTINATION_SWAP_HASH"
  },
  {
    type: "SWAP_COMPLETE",
    typeID: "SWAP_COMPLETE"
  },
];

export function seedSteps(expected) {
  return expected.map((st, index) => ({
    id: index,
    completed: false,
    step: st,
  }));
}

export function computeAllCompleted(steps) {
  return steps.length > 0 && steps.every((s) => s.completed);
}

/**
 * Replace the current list of steps with a new list, preserving completion
 * for any steps that were already marked completed (matched by key).
 */
export function mergeStepsList(prev, list) {
  const completedKeys = new Set();
  for (const prevStep of prev) {
    if (prevStep.completed) {
      completedKeys.add(getStepKey(prevStep.step));
    }
  }
  const next = [];
  for (let index = 0; index < list.length; index++) {
    const step = list[index];
    const key = getStepKey(step);
    next.push({
      id: index,
      completed: completedKeys.has(key),
      step,
    });
  }
  return next;
}

/**
 * Mark a step complete in-place; if the step doesn't yet exist, append it.
 */
export function mergeStepComplete(prev, step) {
  const key = getStepKey(step);
  const updated = [];
  let found = false;
  for (const s of prev) {
    if (getStepKey(s.step) === key) {
      updated.push({ ...s, completed: true, step: { ...s.step, ...step } });
      found = true;
    } else {
      updated.push(s);
    }
  }
  if (!found) {
    updated.push({
      id: updated.length,
      completed: true,
      step,
    });
  }
  return updated;
}
