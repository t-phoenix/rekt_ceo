import React from 'react';
import { Skeleton } from "./ui/skeleton";

const TierDataSkeleton = () => {
    return (
        <div className="current-tier-skeleton" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {/* Header Skeleton */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-32 bg-white/10" />
                    <Skeleton className="h-3 w-24 bg-white/5" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full bg-white/10" />
            </div>

            {/* Content Skeleton */}
            <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-3 w-20 bg-white/20" />
                <Skeleton className="h-8 w-40 bg-white/10" />

                <div className="flex gap-4 w-full justify-center">
                    <Skeleton className="h-6 w-24 bg-white/5" />
                    <Skeleton className="h-6 w-24 bg-white/5" />
                </div>

                <Skeleton className="h-4 w-32 bg-white/5 mt-2" />

                <div className="w-full mt-4 space-y-2">
                    <Skeleton className="h-4 w-full rounded-full bg-white/10" />
                    <div className="flex justify-between">
                        <Skeleton className="h-3 w-16 bg-white/5" />
                        <Skeleton className="h-3 w-16 bg-white/5" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TierDataSkeleton;
