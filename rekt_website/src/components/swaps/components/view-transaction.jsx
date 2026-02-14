import React, { useMemo } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
} from "../../ui/dialog";
import { MoveDown, XIcon } from "lucide-react";
import { TokenIcon } from "./token-icon";
import { StackedTokenIcons } from "./stacked-token-icons";
import { usdFormatter } from "../../common";
import { TOKEN_IMAGES } from "../config/destination";
import { Button } from "../../ui/button";
import TransactionProgress from "./transaction-progress";
import { Separator } from "../../ui/separator";

const TokenBreakdown = ({
  nexusSDK,
  getFiatValue,
  tokenLogo,
  chainLogo,
  symbol,
  amount,
  decimals
}) => {
  return (
    <div className="flex items-center w-full justify-between">
      <div className="flex flex-col items-start gap-y-1">
        <p className="text-xl font-medium">
          {nexusSDK?.utils.formatTokenBalance(amount, {
            symbol: symbol,
            decimals: decimals,
          })}
        </p>
        <p className="text-base text-muted-foreground font-medium ">
          {usdFormatter.format(getFiatValue(amount, symbol))}
        </p>
      </div>
      <TokenIcon symbol={symbol} chainLogo={chainLogo} tokenLogo={tokenLogo} size="lg" />
    </div>
  );
};

const MultiSourceBreakdown = ({
  getFiatValue,
  sources
}) => {
  // Calculate summed USD value across all sources
  const totalUsdValue = useMemo(() => {
    return sources.reduce((sum, source) => {
      const amount = Number.parseFloat(source.amount);
      const fiatValue = getFiatValue(amount, source.token.symbol);
      return sum + fiatValue;
    }, 0);
  }, [sources, getFiatValue]);

  // Prepare sources for stacked icons
  const stackedSources = useMemo(() => {
    return sources.map((source) => ({
      tokenLogo: TOKEN_IMAGES[source.token.symbol] ?? "",
      chainLogo: source.chain.logo,
      symbol: source.token.symbol,
    }));
  }, [sources]);

  return (
    <div className="flex items-center w-full justify-between">
      <div className="flex flex-col items-start gap-y-1">
        <p className="text-xl font-medium">
          {sources.length} source{sources.length > 1 ? "s" : ""}
        </p>
        <p className="text-base text-muted-foreground font-medium">
          {usdFormatter.format(totalUsdValue)}
        </p>
      </div>
      <StackedTokenIcons sources={stackedSources} size="lg" maxDisplay={4} />
    </div>
  );
};

const ViewTransaction = ({
  steps,
  status,
  nexusSDK,
  swapIntent,
  getFiatValue,
  setStatus,
  explorerUrls,
  reset,
  txError,
}) => {
  const transactionIntent = swapIntent.current?.intent;
  const sources = useMemo(() => transactionIntent?.sources ?? [], [transactionIntent]);
  const hasSources = sources.length > 0;
  const hasMultipleSources = sources.length > 1;

  // Prepare source info for TransactionProgress
  const sourceInfo = useMemo(() => {
    if (!hasSources || sources.length === 0) {
      return {
        symbol: "Multiple assets",
        logos: { token: "", chain: "" },
      };
    }
    if (hasMultipleSources) {
      return {
        symbol: `${sources.length} sources`,
        logos: {
          token: TOKEN_IMAGES[sources[0].token.symbol] ?? "",
          chain: sources[0].chain.logo,
        },
      };
    }
    return {
      symbol: sources[0].token.symbol,
      logos: {
        token: TOKEN_IMAGES[sources[0].token.symbol] ?? "",
        chain: sources[0].chain.logo,
      },
    };
  }, [sources, hasSources, hasMultipleSources]);

  if (!transactionIntent) return null;



  return (
    <Dialog
      defaultOpen={true}
      onOpenChange={(open) => {
        if (!open) {
          reset();
        }
      }}>
      <DialogContent className="max-w-md! !p-6" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between w-full">
          <p className="text-sm font-medium text-muted-foreground">
            You're Swapping
          </p>
          <DialogClose>
            <XIcon className="size-5 text-muted-foreground" />
          </DialogClose>
        </DialogHeader>
        <div className="flex flex-col items-start w-full gap-y-4">
          {/* Source section - handle empty, single, and multiple sources */}
          {!hasSources ? (
            <div className="flex items-center w-full justify-between">
              <p className="text-base text-muted-foreground">
                Calculating sources...
              </p>
            </div>
          ) : hasMultipleSources ? (
            <MultiSourceBreakdown getFiatValue={getFiatValue} sources={sources} />
          ) : (
            <TokenBreakdown
              nexusSDK={nexusSDK}
              getFiatValue={getFiatValue}
              tokenLogo={TOKEN_IMAGES[sources[0].token.symbol] ?? ""}
              chainLogo={sources[0].chain.logo}
              symbol={sources[0].token.symbol}
              amount={Number.parseFloat(sources[0].amount)}
              decimals={sources[0].token.decimals} />
          )}
          <MoveDown className="size-5 -ml-1.5 text-muted-foreground" />
          <TokenBreakdown
            nexusSDK={nexusSDK}
            getFiatValue={getFiatValue}
            tokenLogo={
              TOKEN_IMAGES[transactionIntent?.destination?.token.symbol]
            }
            chainLogo={transactionIntent?.destination?.chain.logo}
            symbol={transactionIntent?.destination?.token.symbol}
            amount={Number.parseFloat(transactionIntent?.destination?.amount)}
            decimals={transactionIntent?.destination?.token.decimals} />
        </div>
        {status === "error" && (
          <p className="text-destructive text-sm">{txError}</p>
        )}
        {status === "simulating" && (
          <Button
            onClick={() => {
              setStatus("swapping");
              swapIntent.current?.allow();
            }}
            disabled={!hasSources}>
            {hasSources ? "Continue" : "Waiting for sources..."}
          </Button>
        )}

        {(status === "swapping" || status === "success") && (
          <>
            <Separator className="transition-opacity" />
            <TransactionProgress
              steps={steps}
              explorerUrls={explorerUrls}
              sourceSymbol={sourceInfo.symbol}
              destinationSymbol={transactionIntent.destination.token.symbol}
              sourceLogos={sourceInfo.logos}
              destinationLogos={{
                token: TOKEN_IMAGES[transactionIntent.destination.token.symbol],
                chain: transactionIntent.destination.chain.logo,
              }}
              hasMultipleSources={hasMultipleSources}
              sources={
                hasMultipleSources
                  ? sources.map((s) => ({
                    tokenLogo: TOKEN_IMAGES[s.token.symbol] ?? "",
                    chainLogo: s.chain.logo,
                    symbol: s.token.symbol,
                  }))
                  : undefined
              } />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewTransaction;
