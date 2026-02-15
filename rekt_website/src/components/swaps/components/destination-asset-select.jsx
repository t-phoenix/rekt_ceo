"use client";
import { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { CHAIN_METADATA } from "@avail-project/nexus-core";
import { DESTINATION_SWAP_TOKENS } from "../config/destination";
import { DialogClose } from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "../../ui/select";
import { Link2, Search, X } from "lucide-react";
import { SHORT_CHAIN_NAME, usdFormatter } from "../../common";
import { TokenIcon } from "./token-icon";
import { useNexus } from "../../nexus/NexusProvider";

const DestinationAssetSelect = ({
  swapBalance,
  onSelect,
}) => {
  const { nexusSDK } = useNexus();
  const [tempChain, setTempChain] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get all tokens from all chains with their chain info
  const allTokens = useMemo(() => {
    const tokens = [];
    for (const [chainId, chainTokens] of DESTINATION_SWAP_TOKENS.entries()) {
      for (const token of chainTokens) {
        tokens.push({
          ...token,
          chainId,
        });
      }
    }
    return tokens.map((token) => {
      const balance = swapBalance
        ?.find((t) => t.symbol === token.symbol)
        ?.breakdown?.find((chain) => chain.chain?.id === token.chainId);
      return {
        ...token,
        balance: nexusSDK?.utils?.formatTokenBalance(balance?.balance ?? "0", {
          symbol: token.symbol,
          decimals: balance?.decimals ?? 0,
        }),
        balanceInFiat: usdFormatter.format(balance?.balanceInFiat ?? 0),
      };
    });
  }, [swapBalance, nexusSDK]);

  // Only show chains that have tokens
  const chainsWithTokens = useMemo(() => {
    return Array.from(DESTINATION_SWAP_TOKENS.keys());
  }, []);

  // Filter tokens by selected chain and search query
  const displayedTokens = useMemo(() => {
    let filtered = allTokens;

    // Filter by chain
    if (tempChain) {
      filtered = filtered.filter((t) => t.chainId === tempChain);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((t) =>
        t.symbol.toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query) ||
        t.tokenAddress.toLowerCase().includes(query));
    }

    return filtered;
  }, [tempChain, allTokens, searchQuery]);

  const handlePick = (tok) => {
    const chainId = tempChain ?? tok.chainId;
    if (!chainId) return;
    onSelect(chainId, tok);
  };

  return (
    <div className="w-full flex flex-col gap-y-3">
      <Select
        value={tempChain ? CHAIN_METADATA[tempChain].name : ""}
        onValueChange={(value) => {
          const matchedChain = chainsWithTokens.find((chain) => String(chain) === value);
          if (matchedChain) {
            setTempChain(matchedChain);
          }
        }}>
        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg !mx-2 transition-colors focus-within:border-[#4a90e2]">
          <div className="flex items-center w-full justify-start">
            <Search className="size-4 opacity-50 text-white !ml-2" />
            <input
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!bg-transparent !w-full text-white text-base font-medium outline-none placeholder-white/30 proportional-nums" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-0.5 hover:bg-white/10 rounded-full transition-colors text-white">
                <X className="size-4 opacity-70" />
              </button>
            )}
          </div>
          <SelectTrigger className="w-auto border-none shadow-none focus:ring-0 !p-2 h-auto bg-transparent hover:bg-white/5 rounded-full">
            {tempChain ? (
              <img
                src={CHAIN_METADATA[tempChain].logo}
                alt={CHAIN_METADATA[tempChain].name}
                width={24}
                height={24}
                className="rounded-full size-6" />
            ) : (
              <div
                className="size-6 rounded-full flex items-center justify-center border border-white/20">
                <Link2 className="size-3 text-white/50" />
              </div>
            )}
          </SelectTrigger>
        </div>
        <SelectContent className="bg-[#3b1c32]/95 backdrop-blur-xl border border-white/10 text-white">
          <SelectGroup>
            {chainsWithTokens.map((c) => (
              <SelectItem
                key={c}
                value={String(c)}
                className="focus:bg-[#D81E5B] focus:text-white text-white cursor-pointer data-[state=checked]:bg-white/10 !p-4"
              >
                <div className="flex items-center justify-between gap-x-2">
                  <img
                    src={CHAIN_METADATA[c].logo}
                    alt={CHAIN_METADATA[c].name}
                    width={20}
                    height={20}
                    className="rounded-full size-5" />
                  <span className="text-sm">{CHAIN_METADATA[c].name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <p className="text-sm text-[#cccbcb] font-medium !px-4">
        {tempChain
          ? `Tokens on ${SHORT_CHAIN_NAME[tempChain]}`
          : "All Tokens"}
      </p>
      <div className="rounded-md max-h-80 overflow-y-auto no-scrollbar">
        <div
          className="flex flex-col items-center sm:items-start gap-y-4 w-full no-scrollbar !px-4">
          {displayedTokens.length > 0 ? (
            displayedTokens.map((t) => (
              <DialogClose asChild key={`${t.tokenAddress}-${t.chainId}`}>
                <Button
                  variant={"ghost"}
                  onClick={() => handlePick(t)}
                  className="flex items-center justify-between gap-x-2 p-3 rounded-lg w-full h-auto hover:bg-[#D81E5B] hover:text-white group transition-all duration-200">
                  <div className="flex items-center gap-x-3">
                    {t.symbol ? (
                      <div className="relative">
                        <TokenIcon
                          symbol={t.symbol}
                          tokenLogo={t.logo}
                          chainLogo={CHAIN_METADATA[t.chainId ?? 1]?.logo}
                          className="border border-white/20 rounded-full bg-white/5" />
                      </div>
                    ) : null}
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-base text-white group-hover:text-white">{t.symbol}</span>
                      <span className="text-xs text-white/50 group-hover:text-white/80">{t.name}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-base font-medium text-white group-hover:text-white">{t.balance}</p>
                    <p className="text-sm text-white/50 group-hover:text-white/80">
                      {t.balanceInFiat}
                    </p>
                  </div>
                </Button>
              </DialogClose>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No Tokens Found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DestinationAssetSelect;
