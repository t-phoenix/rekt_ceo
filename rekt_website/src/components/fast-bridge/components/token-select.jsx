import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Label } from "../../ui/label";
import { useNexus } from "../../nexus/NexusProvider";
import { useMemo } from "react";

const TokenSelect = ({
  selectedToken,
  selectedChain,
  handleTokenSelect,
  isTestnet = false,
  disabled = false,
  label
}) => {
  const { supportedChainsAndTokens } = useNexus();
  const tokenData = useMemo(() => {
    return supportedChainsAndTokens
      ?.filter((chain) => chain.id === selectedChain)
      .flatMap((chain) => chain.tokens);
  }, [selectedChain, supportedChainsAndTokens]);

  const selectedTokenData = tokenData?.find((token) => {
    return token.symbol === selectedToken;
  });

  return (
    <Select
      value={selectedToken}
      onValueChange={(value) =>
        !disabled && handleTokenSelect(value)
      }>
      <div className="flex flex-col items-start gap-y-1">
        {label && <Label className="text-sm font-semibold">{label}</Label>}
        <SelectTrigger disabled={disabled} className="w-full h-12! text-base font-light !px-4">
          <SelectValue placeholder="Select a token" className="w-full">
            {selectedChain && selectedTokenData && (
              <div className="flex items-center gap-x-2 w-full">
                <img
                  src={selectedTokenData?.logo}
                  alt={selectedTokenData?.symbol}
                  width={24}
                  height={24}
                  className="rounded-full" />
                {selectedToken}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
      </div>
      <SelectContent className="fast-bridge-select-content">
        <SelectGroup>
          {tokenData?.map((token) => (
            <SelectItem key={token.symbol} value={token.symbol}>
              <div className="flex items-center gap-x-2 !my-1 px-2">
                <img
                  src={token.logo}
                  alt={token.symbol}
                  width={24}
                  height={24}
                  className="rounded-full" />
                <div className="flex flex-col">
                  <span>
                    {isTestnet ? `${token.symbol} (Testnet)` : token.symbol}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default TokenSelect;
