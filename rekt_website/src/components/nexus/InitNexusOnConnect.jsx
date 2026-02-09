"use client";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useNexus } from "./NexusProvider";

export function InitNexusOnConnect() {
    const { status, connector } = useAccount();
    const { handleInit } = useNexus();

    useEffect(() => {
        if (status === "connected" && connector) {
            connector.getProvider().then((p) => handleInit(p));
        }
    }, [status, connector, handleInit]);

    return null;
}
