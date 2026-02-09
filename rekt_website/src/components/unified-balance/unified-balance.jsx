import React, { memo, useMemo } from "react";
import { useNexus } from "../nexus/NexusProvider";
import { Label } from "../ui/label";
import { DollarSign } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const BalanceSkeleton = ({ className }) => {
  return (
    <div className={cn(className)}>
      {/* Total Balance Skeleton */}
      <div className="flex items-center justify-between w-full !px-2 !my-2 opacity-50">
        <Skeleton className="h-5 w-24 bg-white/10" />
        <Skeleton className="h-7 w-32 bg-white/10" />
      </div>

      {/* Accordion Items Skeleton */}
      <div className="w-full flex flex-col gap-4 px-0 my-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="!px-2 !py-4 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] rounded-xl overflow-hidden mb-0"
          >
            <div className="flex items-center justify-between w-full px-6 py-5">
              <div className="flex items-center gap-3 ">
                <Skeleton className="size-7 sm:size-9 rounded-full bg-white/10" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16 bg-white/10" />
                  <Skeleton className="h-3 w-24 bg-white/5" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-5 w-20 bg-white/10" />
                <Skeleton className="h-3 w-16 bg-white/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BalanceBreakdown = ({
  className,
  totalFiat,
  tokens,
  nexusSDK
}) => {
  return (
    <div className={cn(className)}>
      <div className="flex items-center justify-between w-full !px-2 !mb-2">
        <Label className="font-semibold text-muted-foreground">
          Total Balance:
        </Label>

        <Label className="text-lg font-bold gap-x-0">
          <DollarSign className="w-4 h-4 font-bold inline mb-0.5" strokeWidth={3} />
          {totalFiat}
        </Label>
      </div>
      <Accordion type="single" collapsible className="w-full flex flex-col gap-4 px-0 my-4">
        {tokens.map((token) => {
          const positiveBreakdown = token.breakdown.filter((chain) => Number.parseFloat(chain.balance) > 0);
          const chainsCount = positiveBreakdown.length;
          const chainsLabel =
            chainsCount > 1 ? `${chainsCount} chains` : `${chainsCount} chain`;
          return (
            <AccordionItem
              key={token.symbol}
              value={token.symbol}
              className="px-0 border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] rounded-xl overflow-hidden mb-0 data-[state=open]:bg-[rgba(255,255,255,0.08)] transition-colors duration-200"
            >
              <AccordionTrigger
                className="hover:no-underline cursor-pointer items-center !px-6 !py-5 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                hideChevron={false}>
                <div className="flex items-center justify-between w-full pl-2">
                  <div className="flex sm:flex-row flex-col items-center gap-3">
                    <div className="relative size-7 sm:size-9">
                      {token.icon && (
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          className="rounded-full size-full"
                          loading="lazy"
                          decoding="async" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold sm:block hidden text-base sm:text-lg">
                        {token.symbol}
                      </h3>
                      <p className="text-xs text-muted-foreground/70">
                        {chainsLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <p className="text-base sm:text-lg font-medium">
                        {nexusSDK?.utils?.formatTokenBalance(token.balance, {
                          symbol: token.symbol,
                          decimals: token.decimals,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        ${token.balanceInFiat.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-0 bg-[rgba(0,0,0,0.1)]">
                <div className="space-y-4 !py-4 !px-6">
                  {positiveBreakdown.map((chain, index) => (
                    <React.Fragment key={chain.chain.id}>
                      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                        <div className="flex items-center gap-3">
                          <div className="relative size-6 sm:size-7">
                            <img
                              src={chain?.chain?.logo}
                              alt={chain.chain.name}
                              sizes="100%"
                              className="rounded-full size-full"
                              loading="lazy"
                              decoding="async" />
                          </div>
                          <span className="text-sm sm:block hidden font-medium">
                            {chain.chain.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {nexusSDK?.utils?.formatTokenBalance(chain.balance, {
                              symbol: token.symbol,
                              decimals: token.decimals,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${chain.balanceInFiat.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

const UnifiedBalance = ({
  className
}) => {
  const { bridgableBalance, swapBalance, nexusSDK } = useNexus();

  const totalFiat = useMemo(() => {
    if (!bridgableBalance) return "0.00";

    return bridgableBalance
      .reduce((acc, fiat) => acc + fiat.balanceInFiat, 0)
      .toFixed(2);
  }, [bridgableBalance]);

  const swapTotalFiat = useMemo(() => {
    if (!swapBalance) return "0.00";
    return swapBalance
      .reduce((acc, fiat) => acc + fiat.balanceInFiat, 0)
      .toFixed(2);
  }, [swapBalance]);

  const tokens = useMemo(() =>
    bridgableBalance?.filter((token) => Number.parseFloat(token.balance) > 0) ?? [], [bridgableBalance]);

  const swapTokens = useMemo(() =>
    swapBalance?.filter((token) => Number.parseFloat(token.balance) > 0) ??
    [], [swapBalance]);

  // Loading state
  const isLoading = !bridgableBalance || !swapBalance; // Strict check? Or maybe just !bridgableBalance is enough?
  // Since we use both in Tabs, we should probably wait for both or show loading if bridgable is loading (main one).
  // The context sets them independently. Let's check bridgableBalance as it's the default tab.

  if (isLoading) {
    return (
      <BalanceSkeleton
        className="w-full max-w-lg mx-auto py-4 px-1 sm:p-4 flex flex-col gap-y-2 items-center overflow-y-scroll max-h-[372px] rounded-lg border border-border"
      />
    );
  }

  if (!swapBalance) {
    // If swapBalance is missing but bridge is there, we might still want to show tabs but maybe disable swap tab?
    // Or just show single view as originally intended.
    return (
      <BalanceBreakdown
        totalFiat={totalFiat}
        tokens={tokens}
        nexusSDK={nexusSDK}
        className="w-full max-w-lg mx-auto py-4 px-1 sm:p-4 flex flex-col gap-y-2 items-center overflow-y-scroll max-h-[372px] rounded-lg border border-border" />
    );
  }

  return (
    <Tabs
      defaultValue="bridgeBalance"
      className="w-full max-w-lg flex flex-col gap-y-4">
      <TabsList className="w-full flex flex-row gap-2 justify-center bg-transparent p-0">
        <TabsTrigger
          value="bridgeBalance"
          className="flex-1 border-none rounded-md px-4 py-2 text-[var(--color-black)] text-xs font-bold uppercase tracking-wider shadow-[0_4px_15px_rgba(248,200,38,0.3)] transition-all hover:bg-[var(--color-yellow)] hover:text-[var(--color-black)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(248,200,38,0.4)] data-[state=active]:!bg-[var(--color-red)] data-[state=active]:text-[var(--color-white)] data-[state=active]:shadow-[0_4px_15px_rgba(216,30,91,0.3)]">
          Bridgeable Balance
        </TabsTrigger>
        <TabsTrigger
          value="swapBalance"
          className="flex-1 border-none rounded-md px-4 py-2 text-[var(--color-black)] text-xs font-bold uppercase tracking-wider shadow-[0_4px_15px_rgba(248,200,38,0.3)] transition-all hover:bg-[var(--color-yellow)] hover:text-[var(--color-black)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(248,200,38,0.4)] data-[state=active]:!bg-[var(--color-red)] data-[state=active]:text-[var(--color-white)] data-[state=active]:shadow-[0_4px_15px_rgba(216,30,91,0.3)]">
          Swappable Balance
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="bridgeBalance"
        className="w-full overflow-y-scroll max-h-[372px] no-scrollbar px-1">
        <BalanceBreakdown
          totalFiat={totalFiat}
          tokens={tokens}
          nexusSDK={nexusSDK}
          className={className} />
      </TabsContent>
      <TabsContent
        value="swapBalance"
        className="w-full overflow-y-scroll max-h-[372px] no-scrollbar px-1">
        <BalanceBreakdown
          totalFiat={swapTotalFiat}
          tokens={swapTokens}
          nexusSDK={nexusSDK}
          className={className} />
      </TabsContent>
    </Tabs>
  );
};
UnifiedBalance.displayName = "UnifiedBalance";
export default memo(UnifiedBalance);
