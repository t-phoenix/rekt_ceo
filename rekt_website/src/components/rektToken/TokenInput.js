import { Loader2 } from "lucide-react";
import React from "react";

const TokenInput = ({
    label,
    amount,
    setAmount,
    token,
    balance,
    readOnly,
    usdValue,
    isLoading,
    error
}) => {
    return (
        <div className={`token-input-container ${error ? "border-red-500/50" : ""}`}>
            <div className="input-header">
                <span className="input-label">{label}</span>
                {balance !== undefined && (
                    <span className="input-balance">
                        Balance: {balance === null ? <Loader2 className="inline animate-spin ml-1" size={10} /> : balance}
                    </span>
                )}
            </div>
            <div className="input-main">
                <div className="input-wrapper" style={{ position: 'relative', flex: 1 }}>
                    <input
                        type="text"
                        inputMode="decimal"
                        className="amount-input-large"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => {
                            if (setAmount && !readOnly) {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    setAmount(val);
                                }
                            }
                        }}
                        readOnly={readOnly}
                        disabled={readOnly}
                    />
                    {isLoading && <Loader2 className="animate-spin absolute right-2 top-3 text-gray-400" size={16} />}
                </div>

                <button className="token-selector" disabled={true}>
                    {token?.logo && <img src={token.logo} alt={token.symbol} className="token-logo-sm" />}
                    <span className="token-symbol">{token?.symbol}</span>
                </button>
            </div>
            <div className="input-footer">
                <span className="usd-value">{usdValue ? `≈ $${usdValue}` : ""}</span>
                {error && <span className="text-red-400 text-xs ml-auto">{error}</span>}
            </div>
        </div>
    );
};

export default TokenInput;
