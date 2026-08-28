"use client";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useNexus } from "./NexusProvider";

export function InitNexusOnConnect() {
  const { status, connector } = useAccount();
  const { handleInit, nexusSDK, loading } = useNexus();

  useEffect(() => {
    if (status !== "connected" || !connector || nexusSDK?.hasEvmProvider || loading) {
      return;
    }

    connector
      .getProvider()
      .then((provider) => handleInit(provider))
      .catch((error) => {
        console.error("Failed to auto-initialize Nexus:", error);
      });
  }, [status, connector, handleInit, nexusSDK, loading]);

  return null;
}
