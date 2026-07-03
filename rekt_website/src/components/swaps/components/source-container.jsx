import React from "react";
import { Label } from "../../ui/label";
import { cn } from "@/lib/utils";
import { Button } from "../../ui/button";
import { computeAmountFromFraction, usdFormatter } from "../../common";
import { CHAIN_METADATA } from "@avail-project/nexus-core";
import AmountInput from "./amount-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { TokenIcon } from "./token-icon";
import { ChevronDown } from "lucide-react";
import SourceAssetSelect from "./source-asset-select";

const RANGE_OPTIONS = [
  {
    label: "25%",
    value: 0.25,
  },
  {
    label: "50%",
    value: 0.5,
  },
  {
    label: "75%",
    value: 0.75,
  },
  {
    label: "MAX",
    value: 1,
  },
];

const SAFETY_MARGIN = 0.05;

const SourceContainer = ({
  status,
  sourceHovered,
  inputs,
  availableBalance,
  swapBalance,
  swapMode,
  swapIntent,
  setInputs,
  setSwapMode,
  setTxError,
  getFiatValue,
  formatBalance,
}) => {
  const isExactOut = swapMode === "exactOut";

  // In exactIn mode, show user's input; in exactOut mode, show calculated source from intent
  const displayedAmount =
    swapMode === "exactIn"
      ? inputs.fromAmount ?? ""
      : formatBalance(
        swapIntent?.current?.intent?.sources?.[0]?.amount,
        swapIntent?.current?.intent?.sources?.[0]?.token?.symbol,
        swapIntent?.current?.intent?.sources?.[0]?.token?.decimals
      ) ?? "";

  const isDisabled =
    isExactOut || status === "simulating" || status === "swapping";

  // Render exact-out read-only view
  if (isExactOut) {
    return (
      <div
        className="bg-transparent rounded-xl flex flex-col items-center w-full gap-y-4 h-[134px]">
        <div className="w-full flex items-center justify-between">
          <Label className="text-lg font-medium text-foreground">Sell</Label>
        </div>
        <div className="flex items-center justify-center w-full py-4">
          <p className="text-sm text-muted-foreground text-center">
            Enter destination token, chain and amount.
            <br />
            We&apos;ll calculate the best sources for you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-transparent rounded-xl flex flex-col items-center w-full gap-y-4">
      <div className="w-full flex items-center justify-between">
        <Label className="text-lg font-medium text-foreground">Sell</Label>
        <div
          className={cn(
            "flex transition-all duration-150 ease-out w-full justify-end gap-x-2",
            sourceHovered
              ? "opacity-100 translate-y-0"
              : "opacity-100 -translate-y-1"
          )}>
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.label}
              size={"icon-sm"}
              variant={"secondary"}
              disabled={!inputs.fromChainID || !inputs.fromToken}
              onClick={() => {
                if (!inputs.fromToken) return 0;
                setSwapMode("exactIn");
                const amount = computeAmountFromFraction(
                  availableBalance?.balance ?? "0",
                  option.value,
                  inputs?.fromToken?.decimals,
                  SAFETY_MARGIN
                );
                setInputs({ fromAmount: amount, toAmount: undefined });
              }}
              className="!px-5 !py-1.5 rounded-full hover:-translate-y-1 hover:object-scale-dow bg-transparent border-1 box-shadow-[0 4px 8px var(--color-yellow-500)]">
              <p className="text-xs font-medium">{option.label}</p>
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-x-4 w-full amount-input-style bg-transparent">
        <AmountInput
          amount={displayedAmount}
          onChange={(val) => {
            if (availableBalance?.balance) {
              const parsedAvailableBalance = Number.parseFloat(availableBalance?.balance);
              const parsedVal = Number.parseFloat(val);
              if (parsedVal > parsedAvailableBalance) {
                setTxError("Insufficient Balance");
                return;
              }
            }
            setSwapMode("exactIn");
            setInputs({ fromAmount: val, toAmount: undefined });
          }}
          disabled={isDisabled}
        />

        <Dialog>
          <DialogTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-x-3 bg-card/50 hover:bg-card-foreground/10 border border-border min-w-max rounded-full cursor-pointer transition-colors !p-2",
                isDisabled ? "pointer-events-none select-none opacity-50" : ""
              )}>
              <TokenIcon
                symbol={inputs?.fromToken?.symbol}
                tokenLogo={inputs?.fromToken?.logo}
                chainLogo={
                  inputs?.fromChainID
                    ? CHAIN_METADATA[inputs?.fromChainID]?.logo
                    : undefined
                }
                size="lg" />
              <span className="font-medium">{inputs?.fromToken?.symbol}</span>
              <ChevronDown size={16} className="mr-1" />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md! bg-[#3B1C32]/95 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-[#ffd700] text-2xl font-semibold text-center uppercase tracking-wide !mt-2">Select a Token</DialogTitle>
            </DialogHeader>
            <SourceAssetSelect
              onSelect={(fromChainID, fromToken) =>
                setInputs({ ...inputs, fromChainID, fromToken })
              }
              swapBalance={swapBalance} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center justify-between gap-x-4 w-full">
        {inputs.fromAmount && inputs?.fromToken ? (
          <span className="text-sm text-accent-foreground">
            {usdFormatter.format(getFiatValue(Number.parseFloat(inputs.fromAmount), inputs.fromToken?.logo))}
          </span>
        ) : (
          <span className="h-5" />
        )}

        <span className="text-sm text-muted-foreground">
          {formatBalance(
            availableBalance?.balance ?? "0",
            inputs?.fromToken?.symbol,
            availableBalance?.decimals
          )}
        </span>
      </div>
    </div>
  );
};

export default SourceContainer;
