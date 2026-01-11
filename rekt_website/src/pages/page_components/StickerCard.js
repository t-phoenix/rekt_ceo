import React from "react";
import "./StickerCard.css";

// Import rekt_sticker images
import rektAgain from "../../creatives/rekt_stickers/rekt_again.png";
import rektToCeo from "../../creatives/rekt_stickers/rekt_to_ceo.png";
import degenMode from "../../creatives/rekt_stickers/degen-mode-activated.png";
import wagm from "../../creatives/rekt_stickers/wagm.png";
import rektedReady from "../../creatives/rekt_stickers/rekted_and_ready.png";
import degenActivated from "../../creatives/rekt_stickers/degen-activated.png";
import rektBottle from "../../creatives/rekt_stickers/rekt_bottle.png";
import rektceoBeer from "../../creatives/rekt_stickers/rektceo_beer-.png";
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
  { id: "rektceo_beer", name: "RektCEO Beer", image: rektceoBeer, category: "REKT" },
  { id: "rekt_again", name: "Rekt Again", image: rektAgain, category: "REKT" },
  { id: "rekt_to_ceo", name: "Rekt to CEO", image: rektToCeo, category: "REKT" },
  { id: "degen_mode", name: "Degen Mode", image: degenMode, category: "REKT" },
  { id: "wagm", name: "WAGM", image: wagm, category: "REKT" },
  { id: "rekted_ready", name: "Rekted & Ready", image: rektedReady, category: "REKT" },
  { id: "degen_activated", name: "Degen Activated", image: degenActivated, category: "REKT" },
  { id: "rekt_bottle", name: "Rekt Bottle", image: rektBottle, category: "REKT" },
  { id: "ceo_badge", name: "CEO Badge", image: ceoBadge, category: "CEO" }
];

const StickerCard = ({ onAddSticker, onRemoveAllStickers, showRemoveAll = true }) => {
  return (
    <div className="sticker-card">
      <div className="sticker-header">
        <h3 className="sticker-title">Stickers</h3>
        {showRemoveAll && (
          <button
            onClick={onRemoveAllStickers}
            className="dustbin-btn"
            title="Remove all stickers"
          >
            🗑️
          </button>
        )}
      </div>
      <div className="sticker-content">
        <div className="sticker-grid-simple">
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