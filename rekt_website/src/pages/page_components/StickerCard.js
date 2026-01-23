import React, { useRef } from "react";
import "./StickerCard.css";

// Import rekt_sticker images
import rektAgain from "../../creatives/rekt_stickers/rekt_again.png";
import rektToCeo from "../../creatives/rekt_stickers/rekt_to_ceo.png";
import degenMode from "../../creatives/rekt_stickers/degen-mode-activated.png";
import wagm from "../../creatives/rekt_stickers/wagm.png";
import rektedReady from "../../creatives/rekt_stickers/rekted_and_ready.png";
import degenActivated from "../../creatives/rekt_stickers/degen-activated.png";
import ceoBadge from "../../creatives/rekt_stickers/ceo_badge.png";
import hodlBubble from "../../creatives/rekt_stickers/hodl_bubble.png";
import rktController from "../../creatives/rekt_stickers/rkt_controller.png";
import rektlogo from "../../creatives/rekt_stickers/Rekt_logo_2D.png";
import rektlogo3D from "../../creatives/rekt_stickers/Rekt_logo_3D.png";

// Sticker configuration using actual rekt_sticker images
const STICKERS = [
  { id: "rekt_logo_2D", name: "Rekt Logo 2D", image: rektlogo, category: "REKT" },
  { id: "rekt_logo_3D", name: "Rekt Logo 3D", image: rektlogo3D, category: "REKT" },
  { id: "rkt_controller", name: "RKT Controller", image: rktController, category: "REKT" },
  { id: "hodl_bubble", name: "HODL Bubble", image: hodlBubble, category: "CEO" },
  { id: "rekt_again", name: "Rekt Again", image: rektAgain, category: "REKT" },
  { id: "rekt_to_ceo", name: "Rekt to CEO", image: rektToCeo, category: "REKT" },
  { id: "degen_mode", name: "Degen Mode", image: degenMode, category: "REKT" },
  { id: "wagm", name: "WAGM", image: wagm, category: "REKT" },
  { id: "rekted_ready", name: "Rekted & Ready", image: rektedReady, category: "REKT" },
  { id: "degen_activated", name: "Degen Activated", image: degenActivated, category: "REKT" },
  { id: "ceo_badge", name: "CEO Badge", image: ceoBadge, category: "CEO" }
];

const StickerCard = ({ onAddSticker, onRemoveAllStickers, showRemoveAll = true }) => {
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, GIF, etc.)');
        return;
      }

      // Create a URL for the uploaded image
      const imageUrl = URL.createObjectURL(file);

      // Create a custom sticker object
      const customSticker = {
        id: `custom_${Date.now()}`,
        name: file.name,
        image: imageUrl,
        category: "CUSTOM"
      };

      // Add the custom sticker to the canvas
      onAddSticker(customSticker);

      // Reset the input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  return (
    <div className="sticker-card">
      <div className="sticker-header">
        <h3 className="sticker-title">Stickers</h3>

        {showRemoveAll && (
          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
            <button
              className="dustbin-btn"
              title="Upload custom image"
              onClick={handleUploadClick}>
              📤
            </button>
            <button
              onClick={onRemoveAllStickers}
              className="dustbin-btn"
              title="Remove all stickers"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
      <div className="sticker-content">
        <div className="sticker-grid-simple">

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Regular stickers */}
          {STICKERS.map((s) => (
            <button
              key={s.id}
              onClick={() => onAddSticker(s)}
              className="sticker-btn-simple"
            >
              <img
                src={s.image}
                alt={s.name}
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StickerCard; 