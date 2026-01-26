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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Mint NFT</h2>

      <div className="space-y-6">
        {/* Pending Mint Alert */}
        {hasPendingMint && !isMinting && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-bold text-amber-800 dark:text-amber-400">Pending Mint Found</p>
                <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                  You have an incomplete mint. Resume from where you left off or start fresh.
                </p>
                <p className="text-xs font-mono text-amber-600 dark:text-amber-500/80 mt-2 bg-amber-100/50 dark:bg-amber-900/40 px-2 py-1 rounded inline-block">
                  Last step: {STEP_LABELS[currentStep]}
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleResume}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-600/20 transition-all"
                  >
                    Resume Mint
                  </button>
                  <button
                    onClick={handleClearPending}
                    className="px-5 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
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
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 transition-colors">
            <div className="space-y-6">
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
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isComplete
                            ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                            : isActive
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 animate-pulse scale-110"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                            }`}
                        >
                          {isComplete ? "✓" : index + 1}
                        </div>
                        <span className={`text-[10px] mt-2 font-black uppercase tracking-wider text-center ${isActive ? "text-indigo-700 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}>
                          {STEP_LABELS[step]}
                        </span>
                      </div>
                      {index < STEP_ORDER.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mx-2 rounded ${isComplete ? "bg-green-400 dark:bg-green-600" : "bg-gray-200 dark:bg-gray-700"
                            }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Current Step Description */}
              <div className="text-center">
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {STEP_LABELS[currentStep]}
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400/80 mt-1">
                  {STEP_DESCRIPTIONS[currentStep]}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NFT Type Selection - Disabled when minting or has pending */}
        <div className="bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl flex gap-1.5">
          {(["PFP", "MEME"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              disabled={isMinting || hasPendingMint}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all duration-200 ${selectedType === type
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                } ${(isMinting || hasPendingMint) ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 py-2">
          <div className="flex justify-between items-center text-sm px-1">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Your CEO Balance:</span>
            <span className="font-bold dark:text-gray-200 bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded-lg">{userCEOBalance} CEO</span>
          </div>
          {pfpPricing && selectedType === "PFP" && (
            <div className="flex justify-between items-center text-sm px-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium">PFP Price:</span>
              <span className="font-bold dark:text-gray-200 text-indigo-600 dark:text-indigo-400">{pfpPricing.priceCEO} CEO</span>
            </div>
          )}
          {memePricing && selectedType === "MEME" && (
            <div className="flex justify-between items-center text-sm px-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium">MEME Price:</span>
              <span className="font-bold dark:text-gray-200 text-indigo-600 dark:text-indigo-400">{memePricing.priceCEO} CEO</span>
            </div>
          )}
        </div>

        {/* Mint Button - Hidden when there's a pending mint */}
        {!hasPendingMint && (
          <button
            onClick={handleMint}
            disabled={isMinting || !isAuthenticated}
            className={`w-full py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl transition-all duration-300 transform active:scale-[0.98] ${!isAuthenticated
              ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none text-gray-500 dark:text-gray-500"
              : isMinting
                ? "bg-indigo-400 dark:bg-indigo-800 cursor-wait shadow-none"
                : "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right shadow-indigo-500/25"
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-700 dark:text-red-400 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-lg">❌</span>
              <div className="flex-1">
                <p className="font-bold">Transaction Failed</p>
                <p className="text-xs font-mono mt-1 opacity-80 break-words">{error}</p>
                {hasPendingMint && (
                  <p className="text-xs mt-3 font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 p-2 rounded-lg">
                    You can retry from where you left off using the "Resume Mint" button above.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-green-700 dark:text-green-400 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <div>
                <p className="font-bold">Mint Initiated</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">Task ID:</span>
                  <code className="text-xs font-mono">{result.taskId}</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
