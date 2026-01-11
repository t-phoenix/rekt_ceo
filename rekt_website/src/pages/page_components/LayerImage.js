import React from "react"
import rektcoin from "../../creatives/pfp/rekt_coin.png";
import { layers } from "../../constants/layers";
import "../pfp.css";


export default function LayerImage({ selectedLayer }) {
  return <div id="composite-container" className="pfp-image">
    {selectedLayer.slice(0, 4).map((layerelement, index) => (
      <img
        key={`layer-${index}`}
        src={layers[index][layerelement]}
        alt="layer pfp"
        className="composite-layer"
      />
    ))}
    <img
      key="rektcoin"
      src={rektcoin}
      alt="rektcoin layer"
      className="composite-layer"
    />

    {selectedLayer.slice(4, 9).map((layerelement, index) => (
      <img
        key={`layer-${index + 4}`}
        src={layers[index + 4][layerelement]}
        alt="layer pfp"
        className="composite-layer"
      />
    ))}
  </div>
}