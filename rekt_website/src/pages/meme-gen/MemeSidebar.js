import React from 'react';
import CurrentTier from "../../components/CurrentTier.js";
import StickerCard from "../page_components/StickerCard.js";
import TierDataSkeleton from "../../components/TierDataSkeleton.js";

const MemeSidebar = ({
    isLoading,
    onAddSticker,
    removeAllStickers
}) => {
    return (
        <div className="meme-left-column">


            {/* Mint Info */}
            {/* Mint Info */}
            {/* Mint Info with Loader Overlay */}
            {isLoading ? (
                <TierDataSkeleton />
            ) : (
                <CurrentTier collectionType="MEME" />
            )}

            {/* Sticker Section */}
            <StickerCard
                onAddSticker={onAddSticker}
                onRemoveAllStickers={removeAllStickers}
            />

            <div className="meme-subtitle-card">
                <div className="meme-subtitle-content">
                    <p className="meme-gen-subtitle-mint">
                        Craft memes with AI vibes, Own your digital creation with rekt CEO energy. One click to go viral.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MemeSidebar;
