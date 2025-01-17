import React from "react"
import rektcoin from "../../creatives/pfp/rekt_coin.png";
import { layers } from "../../constants/layers";
import "../../styles/pfp.css";
import Image from "next/image";


export default function LayerImage({selectedLayer}){
    return <div id="composite-container" className="pfp-image">
    {selectedLayer.slice(0, 4).map((layerelement, index) => (
      <Image
        key = {index}
        src={layers[index][layerelement]}
        alt="layer pfp"
        className="composite-layer"
      />
    ))}
    <Image
      src={rektcoin}
      alt="rektcoin layer"
      className="composite-layer"
    />

    {selectedLayer.slice(4, 9).map((layerelement, index) => (
      <Image
        key={index}
        src={layers[index + 4][layerelement]}
        alt="layer pfp"
        className="composite-layer"
      />
    ))}
  </div>
}