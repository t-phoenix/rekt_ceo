import React from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import "./SwapModal.css";

export default function SwapModal({ open, onClose, title, steps = [], errorMsg, txHash, successMsg = "Transaction Successful!", explorerUrl }) {
    // Determine overall status based on steps? Or pass it in? 
    // Actually simplicity: If errorMsg exists -> Error. If txHash exists -> Success. Else -> Processing.
    // The steps will carry their own status (idle, pending, completed).

    const isSuccess = !!txHash;
    const isError = !!errorMsg;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="swap-modal-content border-none">
                <DialogHeader className="mb-4 text-left">
                    <DialogTitle className="swap-modal-title">{title}</DialogTitle>
                    <DialogDescription className="text-white/60">
                        Follow the steps to complete your transaction.
                    </DialogDescription>
                </DialogHeader>

                <div className="!space-y-6">
                    {steps.map((step, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div
                                    className={`swap-step-icon ${step.status === "pending"
                                        ? "pending"
                                        : step.status === "completed"
                                            ? "completed"
                                            : "idle"
                                        }`}
                                >
                                    {step.status === "pending" ? <Loader2 className="animate-spin" size={20} /> : <span>{index + 1}</span>}
                                </div>
                                <span className={`step-label ${step.status === "pending" || step.status === "completed" ? "text-white" : "text-white/50"}`}>
                                    {step.label}
                                </span>
                            </div>
                            {step.status === "completed" && (
                                <span className="text-green-500 text-sm font-bold tracking-wide uppercase">Completed</span>
                            )}
                        </div>
                    ))}

                    {/* Status Messages */}
                    {isError && (
                        <div className="swap-error-box">
                            <p className="font-bold">Transaction Failed</p>
                            <p className="text-sm opacity-90">{errorMsg}</p>
                        </div>
                    )}
                    {isSuccess && (
                        <div className="swap-success-box">
                            <p className="mb-2 font-bold text-lg">{successMsg}</p>
                            <a
                                href={explorerUrl || `https://basescan.org/tx/${txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="explorer-link"
                            >
                                View on BaseScan
                            </a>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
