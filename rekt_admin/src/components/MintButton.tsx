import { useState } from "react";
import { useMint, MintStep } from "../hooks";
import type { TierInfo } from "../services/api";

interface MintButtonProps {
  token: string | null;
  userCEOBalance: number | null;
  isAuthenticated: boolean;
  pfpPricing: TierInfo | null;
  memePricing: TierInfo | null;
}

// Step labels for user-friendly display
const STEP_LABELS: Record<MintStep, string> = {
  [MintStep.IDLE]: "Ready",
  [MintStep.PREPARING]: "Preparing...",
  [MintStep.SIGNING]: "Sign Permit",
  [MintStep.PERMITTING]: "Approving Tokens...",
  [MintStep.MINTING]: "Minting NFT...",
  [MintStep.COMPLETE]: "Complete!",
};

// Step descriptions for more context
const STEP_DESCRIPTIONS: Record<MintStep, string> = {
  [MintStep.IDLE]: "",
  [MintStep.PREPARING]: "Fetching permit data from chain...",
  [MintStep.SIGNING]: "Please sign the permit in your wallet",
  [MintStep.PERMITTING]: "Waiting for permit transaction to confirm...",
  [MintStep.MINTING]: "Calling mint API...",
  [MintStep.COMPLETE]: "Your NFT has been minted!",
};

// Step order for progress indicator
const STEP_ORDER: MintStep[] = [MintStep.PREPARING, MintStep.SIGNING, MintStep.PERMITTING, MintStep.MINTING];

export function MintButton({
  token,
  userCEOBalance,
  isAuthenticated,
  pfpPricing,
  memePricing,
}: MintButtonProps) {
  const [selectedType, setSelectedType] = useState<"PFP" | "MEME">("PFP");
  const [result, setResult] = useState<{
    taskId: string;
    status: string;
  } | null>(null);
  const { 
    mint, 
    resumeMint,
    clearPendingMint,
    isMinting, 
    error, 
    currentStep,
    hasPendingMint,
  } = useMint(token, pfpPricing, memePricing);

  const handleMint = async () => {
    setResult(null);
    try {
      const res = await mint(selectedType);
      setResult(res);
    } catch {
      // Error handled in hook
    }
  };

  const handleResume = async () => {
    setResult(null);
    try {
      const res = await resumeMint();
      setResult(res);
    } catch {
      // Error handled in hook
    }
  };

  const handleClearPending = () => {
    clearPendingMint();
    setResult(null);
  };

  // Calculate progress percentage
  const getProgressIndex = () => {
    const idx = STEP_ORDER.indexOf(currentStep);
    return idx >= 0 ? idx : -1;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Mint NFT</h2>

      <div className="space-y-4">
        {/* Pending Mint Alert */}
        {hasPendingMint && !isMinting && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-medium text-amber-800">Pending Mint Found</p>
                <p className="text-sm text-amber-700 mt-1">
                  You have an incomplete mint. Resume from where you left off or start fresh.
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Last step: {STEP_LABELS[currentStep]}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleResume}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                  >
                    Resume Mint
                  </button>
                  <button
                    onClick={handleClearPending}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    Start Fresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator - Show during minting */}
        {isMinting && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="space-y-3">
              {/* Step Progress */}
              <div className="flex items-center justify-between">
                {STEP_ORDER.map((step, index) => {
                  const progressIdx = getProgressIndex();
                  const isActive = step === currentStep;
                  const isComplete = progressIdx > index;
                  
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                            isComplete
                              ? "bg-green-500 text-white"
                              : isActive
                              ? "bg-indigo-600 text-white animate-pulse"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {isComplete ? "✓" : index + 1}
                        </div>
                        <span className={`text-xs mt-1 text-center ${isActive ? "text-indigo-700 font-medium" : "text-gray-500"}`}>
                          {STEP_LABELS[step]}
                        </span>
                      </div>
                      {index < STEP_ORDER.length - 1 && (
                        <div
                          className={`flex-1 h-1 mx-2 rounded ${
                            isComplete ? "bg-green-400" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Current Step Description */}
              <p className="text-sm text-indigo-700 text-center">
                {STEP_DESCRIPTIONS[currentStep]}
              </p>
            </div>
          </div>
        )}

        {/* NFT Type Selection - Disabled when minting or has pending */}
        <div className="flex gap-3">
          {(["PFP", "MEME"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              disabled={isMinting || hasPendingMint}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                selectedType === type
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${(isMinting || hasPendingMint) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {type}
            </button>
          ))}
        </div>

        <div>
          <span className="text-gray-600">User CEO Balance: {userCEOBalance} CEO</span>
          {pfpPricing && selectedType === "PFP" && (
            <div className="flex flex-col gap-2">
              <span className="text-gray-600">
                PFP Price: {pfpPricing.priceCEO} CEO
              </span>
            </div>
          )}
          {memePricing && selectedType === "MEME" && (
            <div className="flex flex-col gap-2">
              <span className="text-gray-600">
                MEME Price: {memePricing.priceCEO} CEO
              </span>
            </div>
          )}
        </div>

        {/* Mint Button - Hidden when there's a pending mint */}
        {!hasPendingMint && (
          <button
            onClick={handleMint}
            disabled={isMinting || !isAuthenticated}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
              !isAuthenticated
                ? "bg-gray-400 cursor-not-allowed"
                : isMinting
                ? "bg-indigo-400 cursor-wait"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            }`}
          >
            {!isAuthenticated
              ? "Sign In to Mint"
              : isMinting
              ? "Processing..."
              : `Mint ${selectedType} NFT`}
          </button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            <div className="flex items-start gap-2">
              <span>❌</span>
              <div>
                <p className="font-medium">Transaction Failed</p>
                <p className="text-xs mt-1">{error}</p>
                {hasPendingMint && (
                  <p className="text-xs mt-2 text-red-600">
                    You can retry from where you left off using the "Resume Mint" button above.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
            <p className="font-medium">✅ Mint Initiated</p>
            <p className="text-xs mt-1">Task: {result.taskId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
