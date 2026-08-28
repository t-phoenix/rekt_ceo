import { useNexus } from "../../nexus/NexusProvider";
import { useCallback, useEffect, useState } from "react";

const ITEMS_PER_PAGE = 10;

function formatExpiryDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const formatted = date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  return formatted.replace(" ", ", ");
}

const useViewHistory = () => {
  const { nexusSDK } = useNexus();
  const [history, setHistory] = useState(null);
  const [displayedHistory, setDisplayedHistory] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sentinelNode, setSentinelNode] = useState(null);

  const observerTarget = useCallback((node) => {
    setSentinelNode(node);
  }, []);

  const fetchIntentHistory = useCallback(async () => {
    try {
      const result = await nexusSDK?.listIntents();
      const intents =
        result?.intents?.map((intent) => ({
          ...intent,
          id: intent.requestHash,
        })) ?? [];

      if (intents.length > 0) {
        setHistory(intents);
        const firstPage = intents.slice(0, ITEMS_PER_PAGE);
        setDisplayedHistory(firstPage);
        setHasMore(intents.length > ITEMS_PER_PAGE);
      } else {
        setHistory([]);
        setDisplayedHistory([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching intent history:", error);
      setHistory([]);
      setDisplayedHistory([]);
      setHasMore(false);
    }
  }, [nexusSDK]);

  useEffect(() => {
    if (!history && nexusSDK) {
      fetchIntentHistory();
    }
  }, [history, fetchIntentHistory, nexusSDK]);

  const loadMore = useCallback(() => {
    if (!history || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = nextPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newItems = history.slice(startIndex, endIndex);

      if (newItems.length > 0) {
        setDisplayedHistory((prev) => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(endIndex < history.length);
      } else {
        setHasMore(false);
      }

      setIsLoadingMore(false);
    }, 300);
  }, [history, page, isLoadingMore, hasMore]);

  useEffect(() => {
    if (!sentinelNode) {
      return;
    }

    const rootElement = sentinelNode.parentElement;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, root: rootElement ?? null }
    );

    observer.observe(sentinelNode);

    return () => {
      observer.disconnect();
    };
  }, [sentinelNode, loadMore, hasMore, isLoadingMore, displayedHistory.length]);

  const getStatus = (pastIntent) => {
    switch (pastIntent?.status) {
      case "fulfilled":
        return "Fulfilled";
      case "deposited":
        return "Deposited";
      case "expired":
        return "Failed";
      case "created":
        return "Deposited";
      default:
        return "Failed";
    }
  };

  return {
    history,
    displayedHistory,
    page,
    hasMore,
    isLoadingMore,
    getStatus,
    observerTarget,
    ITEMS_PER_PAGE,
    formatExpiryDate,
  };
};

export default useViewHistory;
