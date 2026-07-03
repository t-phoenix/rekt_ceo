import { useMemo } from "react";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { cn } from "@/lib/utils";
import { useNexus } from "../../nexus/NexusProvider";

const ChainSelect = ({
  selectedChain,
  disabled,
  hidden = false,
  className,
  label,
  handleSelect,
}) => {
  const { supportedChainsAndTokens } = useNexus();

  const selectedChainData = useMemo(() => {
    if (!supportedChainsAndTokens) return null;
    return supportedChainsAndTokens.find((c) => c.id === selectedChain);
  }, [selectedChain, supportedChainsAndTokens]);

  if (hidden) return null;
  return (
    <Select
      value={selectedChain?.toString() ?? ""}
      onValueChange={(value) => {
        if (!disabled) {
          handleSelect(Number.parseInt(value));
        }
      }} className="w-full ">
      <div className="flex flex-col items-start gap-y-3 w-full">
        {label && <Label className="text-sm font-semibold">{label}</Label>}
        <SelectTrigger disabled={disabled} className="h-12! w-full text-base font-light !px-4">
          <SelectValue>
            {selectedChainData && (
              <div className={cn("flex items-center gap-x-2 w-full !py-2", className)}>
                <img
                  src={selectedChainData?.logo}
                  alt={selectedChainData?.name}
                  width={24}
                  height={24}
                  className="rounded-full" />
                <p className="text-primary test-sm">
                  {selectedChainData?.name}
                </p>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
      </div>
      <SelectContent>
        <SelectGroup
          className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-scroll no-scrollbar">
          {supportedChainsAndTokens?.map((chain) => {
            return (
              <SelectItem key={chain.id} value={String(chain.id)}>
                <div className="flex items-center gap-x-2 my-1 !px-4 !py-2">
                  <img
                    src={chain.logo}
                    alt={chain?.name}
                    width={24}
                    height={24}
                    className="rounded-full" />
                  <p className="text-primary test-sm">{chain.name}</p>
                </div>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default ChainSelect;
