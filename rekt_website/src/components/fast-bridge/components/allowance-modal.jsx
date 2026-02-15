import React, { memo, useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { CHAIN_METADATA } from "@avail-project/nexus-core";
import { useNexus } from "../../nexus/NexusProvider";

const ALLOWANCE_CHOICES = [
  {
    choice: "min",
    title: "Minimum",
    description: "Grant the lowest allowance required for this action.",
  },
  {
    choice: "max",
    title: "Maximum",
    description: "Approve once and skip future approvals for this token.",
  },
  {
    choice: "custom",
    title: "Custom amount",
    description: "Specify an allowance that fits your threshold.",
  },
];

const AllowanceOption = ({
  index,
  name,
  choice,
  selectedChoice,
  onSelect,
  title,
  description,
  children,
  allowanceValue,
}) => {
  const isActive = selectedChoice === choice;

  return (
    <Label className="block cursor-pointer">
      <input
        type="radio"
        name={name}
        value={choice}
        checked={isActive}
        onChange={() => onSelect(index, choice)}
        className="peer sr-only" />
      <div
        className="flex flex-col gap-3 rounded-xl border border-border/40 bg-background/40 !px-4 !py-3 transition peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-checked:border-primary peer-checked:bg-primary/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="text-sm font-medium leading-tight">{title}</p>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {allowanceValue && (
            <p className="text-sm font-medium leading-tight">
              {allowanceValue}
            </p>
          )}
        </div>

        {children}
      </div>
    </Label>
  );
};

const AllowanceModal = ({
  allowance,
  callback,
  onCloseCallback,
}) => {
  const { nexusSDK } = useNexus();
  const [selectedOption, setSelectedOption] = useState([]);
  const [customValues, setCustomValues] = useState([]);

  const { sources, allow, deny } = allowance.current ?? {
    sources: [],
    allow: () => { },
    deny: () => { },
  };

  const defaultChoices = useMemo(
    () => Array.from({ length: sources.length }, () => "min"),
    [sources.length]
  );

  const isCustomValueValid = (value, minimumRaw, decimals) => {
    if (!value || value.trim() === "") return false;
    try {
      const parsedValue = nexusSDK?.utils?.parseUnits(value, decimals);
      if (parsedValue === undefined) return false;
      return parsedValue >= minimumRaw;
    } catch {
      return false;
    }
  };

  const hasValidationErrors = useMemo(() => {
    return sources.some((source, index) => {
      if (selectedOption[index] !== "custom") return false;
      const value = customValues[index];
      if (!value || value.trim() === "") return false;
      return !isCustomValueValid(value, source.allowance.minimumRaw, source.token.decimals);
    });
  }, [sources, selectedOption, customValues]);

  const onClose = () => {
    deny();
    allowance.current = null;
    onCloseCallback?.();
  };

  const onApprove = () => {
    const processed = sources.map((_, i) => {
      const opt = selectedOption[i];
      if (opt === "min" || opt === "max") return opt;
      const rawValue = customValues[i]?.trim();
      if (!rawValue) return "min";
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || parsed < 0) return "min";
      return rawValue;
    });
    try {
      allow(processed);
      allowance.current = null;
      callback?.();
    } catch (error) {
      console.error("AllowanceModal onApprove error", error);
      allowance.current = null;
      onCloseCallback?.();
    }
  };

  const handleChoiceChange = (index, value) => {
    setSelectedOption((prev) => {
      const next = [...(prev.length ? prev : defaultChoices)];
      next[index] = value;
      return next;
    });
  };

  const formatAmount = (value, source) =>
    nexusSDK?.utils?.formatTokenBalance(value, {
      symbol: source.token.symbol,
      decimals: source.token.decimals,
    }) ?? "—";

  useEffect(() => {
    setSelectedOption(defaultChoices);
  }, [defaultChoices]);

  useEffect(() => {
    setCustomValues(Array.from({ length: sources.length }, () => ""));
  }, [sources.length]);

  return (
    <>
      <div className="space-y-1 !p-4">
        <p className="text-lg font-semibold tracking-tight">
          Set Token Allowances
        </p>
        <p className="text-sm text-muted-foreground">
          Review every required token and choose the minimum, an unlimited max,
          or define a custom amount before approving.
        </p>
      </div>
      <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto !p-4">
        {sources?.map((source, index) => (
          <div
            key={`${source.token.symbol}-${index}`}
            className="rounded-2xl border border-border/40 bg-muted/10 p-4 shadow-sm transition hover:border-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-inner">
                  <img
                    src={CHAIN_METADATA[source.chain.id]?.logo}
                    alt={source.chain.name}
                    width={24}
                    height={24}
                    className="rounded-full" />
                </div>
                <div>
                  <p className="text-base font-semibold">
                    {source.token.symbol}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {source.chain.name}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Current allowance
                </p>
                <p className="text-sm font-semibold">
                  {formatAmount(source.allowance.currentRaw, source)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {ALLOWANCE_CHOICES.map((choice) => {
                if (choice.choice === "custom") {
                  const customValue = customValues[index] ?? "";
                  const isCustomSelected = selectedOption[index] === "custom";
                  const showError =
                    isCustomSelected &&
                    customValue.trim() !== "" &&
                    !isCustomValueValid(customValue, source.allowance.minimumRaw, source.token.decimals);
                  return (
                    <AllowanceOption
                      key={choice.choice}
                      index={index}
                      name={`allowance-${index}`}
                      choice={choice.choice}
                      selectedChoice={selectedOption[index]}
                      onSelect={handleChoiceChange}
                      title={choice.title}
                      description={choice.description}>
                      <div className="flex flex-col gap-2 !p-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={isCustomSelected ? customValue : ""}
                          onChange={(e) => {
                            const next = [...customValues];
                            next[index] = e.target.value;
                            setCustomValues(next);
                          }}
                          maxLength={source.token.decimals}
                          className={`h-9 w-40 rounded-lg border bg-background/80 text-sm disabled:opacity-60 ${showError ? "border-destructive" : ""
                            }`}
                          disabled={!isCustomSelected} />
                        {showError && (
                          <p className="text-xs text-destructive">
                            Min: {source.allowance.minimum}
                          </p>
                        )}
                      </div>
                    </AllowanceOption>
                  );
                }
                return (
                  <AllowanceOption
                    key={choice.choice}
                    index={index}
                    name={`allowance-${index}`}
                    choice={choice.choice}
                    selectedChoice={selectedOption[index]}
                    onSelect={handleChoiceChange}
                    title={choice.title}
                    description={choice.description}
                    allowanceValue={
                      choice.choice === "min"
                        ? formatAmount(source.allowance.minimumRaw, source)
                        : "Unlimited"
                    } />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div
        className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="ghost" onClick={onClose} className="font-semibold">
          Deny
        </Button>
        <Button
          onClick={onApprove}
          className="w-full sm:w-auto font-semibold"
          disabled={hasValidationErrors}>
          Approve Selected
        </Button>
      </div>
    </>
  );
};

AllowanceModal.displayName = "AllowanceModal";

export default memo(AllowanceModal);
