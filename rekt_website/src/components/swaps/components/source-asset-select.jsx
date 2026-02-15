"use client";
import { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { useNexus } from "../../nexus/NexusProvider";
import { CHAIN_METADATA } from "@avail-project/nexus-core";
import { TOKEN_IMAGES } from "../config/destination";
import { Link2, Loader2, Search, X } from "lucide-react";
import { DialogClose } from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "../../ui/select";
import { TokenIcon } from "./token-icon";
import { SHORT_CHAIN_NAME } from "../../common";

const SourceAssetSelect = ({
  onSelect,
  swapBalance,
}) => {
  const { swapSupportedChainsAndTokens, nexusSDK } = useNexus();
  const [tempChain, setTempChain] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get all tokens from swapBalance with their chain info
  const allTokens = useMemo(() => {
    if (!swapBalance) return [];
    const tokens = [];

    for (const asset of swapBalance) {
      if (!asset?.breakdown?.length) continue;
      for (const breakdown of asset.breakdown) {
        if (Number.parseFloat(breakdown.balance) <= 0) continue;

        tokens.push({
          contractAddress: breakdown.contractAddress,
          decimals: breakdown.decimals ?? asset.decimals,
          logo: TOKEN_IMAGES[asset.symbol] ?? "",
          name: asset.symbol,
          symbol: asset.symbol,
          balance: nexusSDK?.utils?.formatTokenBalance(breakdown?.balance, {
            symbol: asset.symbol,
            decimals: asset.decimals,
          }),
          balanceInFiat: `$${breakdown.balanceInFiat}`,
          chainId: breakdown.chain?.id,
        });
      }
    }

    // Dedupe by contractAddress + chainId
    const unique = new Map();
    for (const t of tokens) {
      const key = `${t.contractAddress.toLowerCase()}-${t.chainId}`;
      unique.set(key, t);
    }
    return Array.from(unique.values());
  }, [swapBalance, nexusSDK]);

  // Only show chains that have tokens with balance
  const chainsWithTokens = useMemo(() => {
    if (!swapSupportedChainsAndTokens || !allTokens.length) return [];
    const chainIdsWithTokens = new Set(allTokens.map((t) => t.chainId));
    return swapSupportedChainsAndTokens.filter((c) =>
      chainIdsWithTokens.has(c.id));
  }, [swapSupportedChainsAndTokens, allTokens]);

  // Filter tokens by selected chain and search query
  const displayedTokens = useMemo(() => {
    let filtered = allTokens;

    // Filter by chain
    if (tempChain) {
      filtered = filtered.filter((t) => t.chainId === tempChain.id);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((t) =>
        t.symbol.toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query) ||
        t.contractAddress.toLowerCase().includes(query));
    }

    return filtered;
  }, [tempChain, allTokens, searchQuery]);

  const handlePick = (tok) => {
    const chainId = tempChain?.id ?? tok.chainId;
    if (!chainId) return;
    onSelect(chainId, tok);
  };

  if (!swapBalance)
    return (
      <div className="flex flex-col items-center justify-center gap-y-3">
        <p className="text-sm text-muted-foreground">
          Fetching swappable assets
        </p>
        <Loader2 className="animate-spin size-5" />
      </div>
    );

  return (
    <div className="w-full flex flex-col gap-y-3">
      <Select
        value={tempChain?.name}
        onValueChange={(value) => {
          const matchedChain = chainsWithTokens.find((chain) => chain.name === value);
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
                src={tempChain?.logo}
                alt={tempChain?.name}
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
                key={c.id}
                value={c.name}
                className="focus:bg-[#D81E5B] focus:text-white text-white cursor-pointer data-[state=checked]:bg-white/10 !p-4"
              >
                <div className="flex items-center justify-between gap-x-2">
                  <img
                    src={c.logo}
                    alt={c.name}
                    width={20}
                    height={20}
                    className="rounded-full size-5" />
                  <span className="text-sm">{c.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <p className="text-sm text-[#cccbcb] font-medium !px-4">
        {tempChain?.id
          ? `Tokens on ${SHORT_CHAIN_NAME[tempChain.id]}`
          : "All Tokens"}
      </p>
      <div className="rounded-md max-h-80 overflow-y-auto no-scrollbar">
        <div
          className="flex flex-col items-center sm:items-start gap-y-4 w-full no-scrollbar !px-4">
          {displayedTokens.length > 0 ? (
            displayedTokens.map((t) => (
              <DialogClose asChild key={`${t.contractAddress}-${t.chainId}`}>
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

export default SourceAssetSelect;
