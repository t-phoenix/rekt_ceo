import { Fragment, useEffect, useRef } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { useNexus } from "../../nexus/NexusProvider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { SHORT_CHAIN_NAME } from "../../common";
import { LoaderCircle } from "lucide-react";

const AmountInput = ({
  amount,
  onChange,
  bridgableBalance,
  onCommit,
  disabled,
  inputs,
}) => {
  const { nexusSDK, loading } = useNexus();
  const commitTimerRef = useRef(null);

  const scheduleCommit = (val) => {
    if (!onCommit || disabled) return;
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      onCommit(val);
    }, 800);
  };

  const onMaxClick = async () => {
    if (!nexusSDK || !inputs) return;
    const maxBalAvailable = await nexusSDK?.calculateMaxForBridge({
      token: inputs?.token,
      toChainId: inputs?.chain,
      recipient: inputs?.recipient,
    });
    if (!maxBalAvailable) return;
    onChange(maxBalAvailable.amount);
    onCommit?.(maxBalAvailable.amount);
  };

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-y-2 pb-2 w-full">
      <div
        className="amount-input-container w-full flex justify-between sm:flex-row flex-col border border-border rounded-lg gap-y-2">
        <Input
          type="text"
          inputMode="decimal"
          value={amount ?? ""}
          placeholder="Enter Amount"
          onChange={(e) => {
            let next = e.target.value.replaceAll(/[^0-9.]/g, "");
            const parts = next.split(".");
            if (parts.length > 2)
              next = parts[0] + "." + parts.slice(1).join("");
            if (next === ".") next = "0.";
            onChange(next);
            scheduleCommit(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (commitTimerRef.current) {
                clearTimeout(commitTimerRef.current);
                commitTimerRef.current = null;
              }
              onCommit?.(amount ?? "");
            }
          }}
          className="w-full border-none bg-transparent rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none py-0 px-3  h-12!"
          aria-invalid={Boolean(amount) && Number.isNaN(Number(amount))}
          disabled={disabled || loading} />
        <div
          className="flex items-center justify-end-safe gap-x-2 sm:gap-x-2 w-fit px-2 !mr-4 border-l border-border">
          {bridgableBalance && (
            <p className="text-base font-medium min-w-max">
              {nexusSDK?.utils?.formatTokenBalance(bridgableBalance?.balance, {
                symbol: bridgableBalance?.symbol,
                decimals: bridgableBalance?.decimals,
              })}
            </p>
          )}
          {loading && !bridgableBalance && (
            <LoaderCircle className="size-4 animate-spin" />
          )}
          <Button
            size={"sm"}
            variant={"ghost"}
            onClick={onMaxClick}
            className="!px-2 font-medium"
            disabled={disabled}>
            MAX
          </Button>
        </div>
      </div>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="balance-breakdown">
          <AccordionTrigger
            className="w-fit justify-end items-center py-0 mt-2 gap-x-0.5 cursor-pointer text-sm font-normal"
            hideChevron={false}>
            View Balance Breakdown
          </AccordionTrigger>
          <AccordionContent className="balance-breakdown-container pb-0 mt-4">
            <div className="space-y-1 py-1">
              {bridgableBalance?.breakdown.map((chain) => {
                if (Number.parseFloat(chain.balance) === 0) return null;
                return (
                  <Fragment key={chain.chain.id}>
                    <div className="balance-row flex items-center justify-between px-2 py-1 rounded-md">
                      <div className="flex items-center gap-2">
                        <div className="relative h-6 w-6">
                          <img
                            src={chain?.chain?.logo}
                            alt={chain.chain.name}
                            sizes="100%"
                            className="rounded-full"
                            loading="lazy"
                            decoding="async"
                            width="20"
                            height="20" />
                        </div>
                        <span className="text-sm font-light sm:block hidden">
                          {SHORT_CHAIN_NAME[chain.chain.id]}
                        </span>
                      </div>
                      <p className="text-sm font-light text-right">
                        {nexusSDK?.utils?.formatTokenBalance(chain.balance, {
                          symbol: bridgableBalance?.symbol,
                          decimals: bridgableBalance?.decimals,
                        })}
                      </p>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default AmountInput;
