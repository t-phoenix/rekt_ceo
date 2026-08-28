import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Skeleton } from "../../ui/skeleton";
import { useNexus } from "../../nexus/NexusProvider";

const SourceBreakdown = ({
  intent,
  tokenSymbol,
  isLoading = false
}) => {
  const { nexusSDK } = useNexus();
  const sources = intent?.selectedSources ?? intent?.availableSources ?? intent?.sources ?? [];
  const tokenMeta = intent?.destination?.token ?? intent?.token;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="sources">
        <div className="flex items-start justify-between gap-x-4 w-full">
          {isLoading ? (
            <>
              <div className="flex flex-col items-start gap-y-1 min-w-fit">
                <p className="text-base font-light">You Spend</p>
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="flex flex-col items-end gap-y-1 min-w-fit">
                <Skeleton className="h-5 w-24" />
                <div className="w-fit">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </>
          ) : (
            sources.length > 0 && (
              <>
                <div className="flex flex-col items-start gap-y-1 min-w-fit">
                  <p className="text-base font-light">You Spend</p>
                  <p className="text-sm font-light">
                    {`${tokenMeta?.symbol?.toUpperCase() ?? tokenSymbol} on ${sources.length
                      } ${sources.length > 1 ? "chains" : "chain"}`}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-y-1 min-w-fit">
                  <p className="text-base font-light">
                    {nexusSDK?.utils?.formatTokenBalance(intent?.sourcesTotal, {
                      symbol: tokenSymbol,
                      decimals: tokenMeta?.decimals,
                    })}
                  </p>
                  <AccordionTrigger
                    containerClassName="w-fit"
                    className="py-0 items-center gap-x-1"
                    hideChevron={false}>
                    <p className="text-sm font-light">View Sources</p>
                  </AccordionTrigger>
                </div>
              </>
            )
          )}
        </div>
        {!isLoading && sources.length > 0 && (
          <AccordionContent className="balance-breakdown-container my-4 !mt-2 pb-0 !px-4 !py-2 rounded-lg w-full border-1">
            <div className="flex flex-col items-center gap-y-3">
              {sources.map((source) => (
                <div
                  key={source.chain?.id ?? source.chainID}
                  className="flex items-center justify-between w-full gap-x-2">
                  <div className="flex items-center gap-x-2">
                    <img
                      src={source?.chain?.logo ?? source?.chainLogo}
                      alt={source?.chain?.name ?? source?.chainName}
                      width={20}
                      height={20}
                      className="rounded-full" />
                    <p className="text-base font-light">
                      {source?.chain?.name ?? source?.chainName}
                    </p>
                  </div>

                  <p className="text-base font-light">
                    {nexusSDK?.utils?.formatTokenBalance(source.amount, {
                      symbol: tokenSymbol,
                      decimals: tokenMeta?.decimals,
                    })}
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        )}
      </AccordionItem>
    </Accordion>
  );
};

export default SourceBreakdown;
