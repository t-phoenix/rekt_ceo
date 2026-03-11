import React, { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import "./pfp.css";
import "./landingpage/styles/story.css";
import InteractiveGlow from "../components/InteractiveGlow.js";
import PerksCarousel from "./page_components/PerksCarousel.js";
import { MdShuffle } from "react-icons/md";
import SocialShareFooter from "./page_components/SocialShareFooter.js";
import MintConfirmModal from "../components/MintConfirmModal.js";
import MintSuccessModal from "../components/MintSuccessModal.js";
import ComingSoonButton from "../components/ComingSoonButton.js";

import { layerNames } from "../constants/layers";
import LayerImage from "./page_components/LayerImage";
import LayerNavbar from "./page_components/LayerNavbar";
import LayerOptions from "./page_components/LayerOptions";

import sharingService from "../services/SharingService.js";
import CurrentTier from "../components/CurrentTier.js";
import TierDataSkeleton from "../components/TierDataSkeleton.js";
import { useAccount } from 'wagmi';
import { useTierData, useUserData } from "../hooks/useNftData";


const limits = [6, 3, 4, 5, 4, 4, 3, 7]; // Maximum random value for each index


export default function ProfileNFT() {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [currentIndex, setCurrentIndex] = useState(1); // Start with the second item as the current
  const [selectedLayer, setSelectedLayer] = useState([0, 0, 0, 0, 0, 0, 0, 0]); // BG/ Hoodie / Pants / Shoes/ Skin / Face / Jewellery / Coin
  const { address, isConnected } = useAccount();
  const { data: userData } = useUserData(address);

  // Use custom hook for dynamic tier data
  const { activeTier, totalSupply, isLoading } = useTierData('PFP');
  console.log("Active Tier PFP: ", activeTier)
  console.log("Total Supply PFP: ", totalSupply)

  // Mint modal state
  const [showMintConfirm, setShowMintConfirm] = useState(false);
  const [showMintSuccess, setShowMintSuccess] = useState(false);
  const [mintPreviewImage, setMintPreviewImage] = useState(null);
  const [mintResult, setMintResult] = useState(null);



  const randomiseLayers = useCallback(() => {
    const randomized = limits.map((limit) =>
      Math.floor(Math.random() * (limit + 1))
    );
    setSelectedLayer(randomized);
  }, []);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    randomiseLayers();
    return () => window.removeEventListener("resize", handleResize);
  }, [randomiseLayers]);

  const showToast = useCallback((message) => {
    // Simple toast implementation
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "slideOut 0.3s ease";
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }, []);

  // Initialize sharing service with toast function
  useEffect(() => {
    sharingService.setToastFunction(showToast);
  }, [showToast]);

  // eslint-disable-next-line no-unused-vars
  const handleMint = async () => {
    try {
      // Capture the composite PFP image
      const compositeElement = document.getElementById('composite-container');
      if (!compositeElement) {
        showToast("Please wait for PFP to load!");
        return;
      }

      // Use html2canvas to capture the composite
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(compositeElement, {
        useCORS: true,
        backgroundColor: null
      });
      const preview = canvas.toDataURL('image/png');

      setMintPreviewImage(preview);
      setShowMintConfirm(true);
    } catch (error) {
      console.error('Error capturing PFP:', error);
      showToast("Failed to capture PFP preview");
    }
  };

  const handleSocialShare = async (platform) => {
    await sharingService.handleSocialShare(platform, {
      elementId: 'composite-container',
      shareText: 'Check out my Rekt CEO PFP NFT!',
      fileName: 'rekt-ceo-pfp'
    });
  };



  // Show responsive message for small screens to match site theme
  if (screenWidth < 900) {
    return (
      <div className="responsive-message-container">
        <div className="responsive-message-card">
          <div className="responsive-message-icon">💼</div>
          <h1 className="responsive-message-title">CEO of Responsiveness</h1>
          <p className="responsive-message-subtitle">
            This PFP builder is best experienced on desktop. We re brewing a mobile-friendly version.
          </p>
          <div className="responsive-message-requirements">
            <div className="requirement-item">
              <span className="requirement-icon">📱</span>
              <span>Current: {screenWidth}px</span>
            </div>
            <div className="requirement-item">
              <span className="requirement-icon">💻</span>
              <span>Required: 1200px+</span>
            </div>
          </div>
          <p className="responsive-message-footer">
            Switch to a larger screen to mint your ultimate REKT CEO PFP.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pfp-gen-container">
      <Helmet>
        <title>PFP Minting | REKT CEO ($CEO)</title>
        <meta name="description" content="Mint your REKT CEO ($CEO) profile picture NFT. A unique on-chain identity collectible for the $CEO community — not an investment." />
        <link rel="canonical" href="https://www.rektceo.club/pfp" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.rektceo.club/pfp" />
        <meta property="og:title" content="PFP Minting | REKT CEO ($CEO)" />
        <meta property="og:description" content="Mint your REKT CEO ($CEO) profile picture NFT." />
        <meta property="og:image" content="https://www.rektceo.club/rekt.webp" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@rekt_ceo" />
        <meta name="twitter:image" content="https://www.rektceo.club/rekt.webp" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "REKT CEO PFP Minter",
          "url": "https://www.rektceo.club/pfp",
          "applicationCategory": "FinanceApplication",
          "description": "Mint your REKT CEO PFP NFT — a unique on-chain identity collectible on Base L2. Customize layers and mint your profile picture.",
          "featureList": "Layer-based customization, randomize options, NFT minting on Base, social sharing"
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            { "@type": "Question", "name": "What is the REKT CEO PFP?", "acceptedAnswer": { "@type": "Answer", "text": "The REKT CEO PFP is an on-chain profile picture NFT. You customize layers (background, hoodie, pants, shoes, skin, face, jewellery, coin) and mint a unique collectible for the $CEO community on Base." } },
            { "@type": "Question", "name": "How do I customize my PFP?", "acceptedAnswer": { "@type": "Answer", "text": "Use the Options panel to switch layers for each trait. Click Randomise to generate a random combination, then mint when you are happy with the preview." } },
            { "@type": "Question", "name": "On which chain can I mint the PFP?", "acceptedAnswer": { "@type": "Answer", "text": "REKT CEO PFPs mint on Base L2. Connect a Base-compatible wallet and use $CEO token to mint." } }
          ]
        })}</script>
      </Helmet>
      <InteractiveGlow />
      <main className="pfp-gen-main">
        <header className="pfp-gen-header">
          {/* <h1 className="pfp-gen-title">Mint Your Unique $CEO PFP NFT</h1> */}
        </header>

        <section className="pfp-gen-grid">
          {/* Left Column: Info & CTA */}
          <div className="pfp-left-column">
            {/* Mint Info with Loader Overlay */}
            {isLoading ? (
              <TierDataSkeleton />
            ) : (
              <CurrentTier collectionType="PFP" />
            )}

            {/* Perks Carousel Section */}
            <PerksCarousel />

            <div className="pfp-subtitle-card">
              <div className="pfp-subtitle-content">
                <p className="pfp-gen-subtitle-mint">
                  Build your flex. Mint your identity. Become the CEO of your timeline.
                </p>
              </div>
            </div>
          </div>

          {/* Center Column: Preview */}
          <div className="pfp-canvas-card">
            <div className="pfp-canvas-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 className="pfp-canvas-title">PFP Preview</h3>
                <div className="pfp-canvas-actions">
                  {/* <button onClick={downloadImage} className="story-btn primary">
                    <span style={{ marginRight: 6 }}>Download</span> <MdDownload />
                  </button> */}
                  <button onClick={randomiseLayers} className="story-btn secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ marginRight: 6 }}>Randomise</span> <MdShuffle />
                  </button>
                </div>
              </div>
            </div>
            <div className="pfp-canvas-content">
              <div className="pfp-canvas-stage has-image">
                <LayerImage selectedLayer={selectedLayer} />
              </div>
            </div>

            {/* Social Share Footer */}
            <SocialShareFooter onSocialShare={handleSocialShare} />

          </div>

          {/* Right Column: Controls */}
          <div className="pfp-controls-card">
            <div className="pfp-controls-header">
              <h3 className="pfp-controls-title">Options</h3>
            </div>
            <div className="pfp-controls-content">

              <div className="pfp-control-group">
                <LayerNavbar currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} />
              </div>
              <div className="pfp-control-group">
                <LayerOptions
                  currentIndex={currentIndex}
                  selectedLayer={selectedLayer}
                  setSelectedLayer={setSelectedLayer}
                />
              </div>


              <div className="pfp-ready-card" style={{ marginTop: "0.6rem" }}>
                <div className="pfp-ready-header">
                  <h3 className="pfp-ready-title">Ready?</h3>
                </div>
                <div className="pfp-ready-content">
                  {isConnected && userData && (
                    <div className="flex flex-row items-center justify-between w-full mb-0.5 px-1">
                      <div className="flex flex-row items-center">
                        <span className="text-sm font-medium text-gray-400">Your Balance: </span>
                        <span className="text-md font-bold text-white !ml-0.5">{parseFloat(userData.ceoBalance?.balance || 0).toLocaleString()} CEO</span>
                      </div>
                      <div className="flex flex-row items-center">
                        <span className="text-sm font-medium text-gray-400">PFPs Owned: </span>
                        <span className="text-md font-bold text-white !ml-0.5">{userData.mintInfo?.pfp.mintCount || 0} / {userData.mintInfo?.pfp.maxMint || 0}</span>
                      </div>
                    </div>
                  )}
                  {/* PRODUCTION TODO: Remove <ComingSoonButton> below and uncomment the original button when deploying with production token */}
                  <ComingSoonButton className="story-btn secondary" style={{ width: "100%" }} label="Mint NFT (Coming Soon)" />
                  {/* <button onClick={handleMint} className="story-btn secondary" style={{ width: "100%" }}>
                    Mint NFT (Coming Soon)
                  </button> */}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section aria-label="About PFP Minting" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        <h2>About REKT CEO PFP Minting</h2>
        <p>Mint your unique REKT CEO profile picture NFT on Base. Customize eight layers — background, hoodie, pants, shoes, skin, face, jewellery, and coin — to build a one-of-one identity for the $CEO community.</p>
        <p>Use Randomise to explore combinations, then connect your wallet and mint. PFPs are on-chain collectibles, not financial products.</p>
        <h3>Frequently asked questions</h3>
        <dl>
          <dt>What is the REKT CEO PFP?</dt>
          <dd>An on-chain profile picture NFT. You customize layers and mint a unique collectible for the $CEO community on Base.</dd>
          <dt>How do I customize my PFP?</dt>
          <dd>Use the Options panel to change each trait. Click Randomise for a random combo, then mint when you like the preview.</dd>
          <dt>On which chain can I mint?</dt>
          <dd>PFPs mint on Base L2. Connect a Base-compatible wallet and use $CEO to mint.</dd>
        </dl>
      </section>

      {/* Mint Confirmation Modal */}
      <MintConfirmModal
        isOpen={showMintConfirm}
        onClose={() => setShowMintConfirm(false)}
        onConfirm={(result) => {
          setShowMintConfirm(false);
          setMintResult(result);
          setShowMintSuccess(true);
          showToast("🎉 PFP NFT minted successfully!");
        }}
        imagePreview={mintPreviewImage}
        type="PFP"
        pricing={{
          tier: activeTier?.name || "Premium",
          usdPrice: activeTier?.priceUSD ? `$${activeTier.priceUSD}` : "Free",
          ceoPrice: activeTier?.priceCEO ? `${activeTier.priceCEO.toLocaleString()} CEO` : "Priceless",
          currentSupply: activeTier?.minted?.toLocaleString() || "--",
          totalSupply: activeTier?.supply?.toLocaleString() || "999"
        }}
        attributes={[
          { trait_type: 'Background', value: layerNames[0][selectedLayer[0]] },
          { trait_type: 'Hoodie', value: layerNames[1][selectedLayer[1]] },
          { trait_type: 'Pants', value: layerNames[2][selectedLayer[2]] },
          { trait_type: 'Shoes', value: layerNames[3][selectedLayer[3]] },
          { trait_type: 'Skin', value: layerNames[4][selectedLayer[4]] },
          { trait_type: 'Face', value: layerNames[5][selectedLayer[5]] },
          { trait_type: 'Jewellery', value: layerNames[6][selectedLayer[6]] },
          { trait_type: 'Coin', value: layerNames[7][selectedLayer[7]] },
        ]}
        userData={userData}
        isConnected={isConnected}
      />

      {/* Mint Success Modal */}
      <MintSuccessModal
        isOpen={showMintSuccess}
        onClose={() => setShowMintSuccess(false)}
        imagePreview={mintPreviewImage}
        type="PFP"
        onSocialShare={handleSocialShare}
        mintResult={mintResult}
      />
    </div>
  );
}
