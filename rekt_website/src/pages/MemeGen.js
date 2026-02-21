import { useState, useEffect, useCallback } from "react";
import "./meme-gen/memeGen.css";
import "./landingpage/styles/story.css";
import InteractiveGlow from "../components/InteractiveGlow.js";
import { categorizedMemeTemplates, memeCategories } from "../constants/memeData";
import sharingService from "../services/SharingService.js";
import AiGenerateModal from "../components/AiGenerateModal.js";
import BrandifyModal from "../components/BrandifyModal.js";
import MintConfirmModal from "../components/MintConfirmModal.js";
import MintSuccessModal from "../components/MintSuccessModal.js";
import memeApiService from "../services/MemeApiService.js";
import { useAccount } from 'wagmi';
import { useTierData, useUserData } from "../hooks/useNftData";

// Components
import MemeSidebar from "./meme-gen/MemeSidebar.js";
import MemeCanvas from "./meme-gen/MemeCanvas.js";
import MemeControls from "./meme-gen/MemeControls.js";
import ResponsiveMessage from "./meme-gen/ResponsiveMessage.js";
import { useMemeCanvasLogic } from "../hooks/useMemeCanvasLogic.js";

const MemeGen = () => {
  // Use custom hook for dynamic tier data
  const { activeTier, isLoading } = useTierData('MEME');
  const { address, isConnected } = useAccount();
  const { data: userData } = useUserData(address);

  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [font, setFont] = useState("display");
  const [textColor, setTextColor] = useState("#ffffff");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [imageSrc, setImageSrc] = useState(null);
  const [activeCategory, setActiveCategory] = useState(memeCategories[0] || "");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // Canvas dimensions state
  const [canvasFormat, setCanvasFormat] = useState("square"); // square, portrait, landscape, dynamic
  const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1, ratio: 1 });

  // AI modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Brandify modal state
  const [isBrandifyModalOpen, setIsBrandifyModalOpen] = useState(false);
  const [isBrandifying, setIsBrandifying] = useState(false);

  // Mint modal state
  const [showMintConfirm, setShowMintConfirm] = useState(false);
  const [showMintSuccess, setShowMintSuccess] = useState(false);
  const [mintPreviewImage, setMintPreviewImage] = useState(null);

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

  // Use the canvas logic hook
  const {
    items,
    setItems,
    textPositions,
    setTextPositions,
    stageRef,
    activeId,
    setActiveId,
    activeTextId,
    setActiveTextId,
    onAddSticker,
    removeAllStickers,
    removeSticker,
    handlePointerDown,
    handleTextPointerDown,
    handlePointerMove,
    handlePointerUp,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleRotateStart,
    handleRotateMove,
    handleRotateEnd
  } = useMemeCanvasLogic(showToast);

  // Function to get templates for selected category
  const getTemplatesForCategory = (category) => {
    return (
      categorizedMemeTemplates[category] ||
      (memeCategories[0] ? categorizedMemeTemplates[memeCategories[0]] : [])
    );
  };

  // Function to handle template selection
  const handleTemplateSelect = useCallback((templateId) => {
    setSelectedTemplate(templateId);
    const template = Object.values(categorizedMemeTemplates)
      .flat()
      .find((t) => t.id === templateId);

    if (template) {
      const resolvedSrc =
        template.src && typeof template.src === "object" && "default" in template.src
          ? template.src.default
          : template.src;

      const img = new Image();
      img.onload = () => {
        setImageSrc(resolvedSrc);
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight, ratio: img.naturalWidth / img.naturalHeight });
        showToast(`Applied ${template.name} template!`);
      };
      img.onerror = () => {
        showToast("Failed to load template image.");
      };
      img.src = `${resolvedSrc}`;
    }
  }, [showToast]);

  // Function to handle category switching
  const handleCategorySwitch = (category) => {
    setActiveCategory(category);
    const activeIndex = memeCategories.indexOf(category);
    const categoriesContainer = document.querySelector(".meme-template-categories");
    if (categoriesContainer && activeIndex >= 0) {
      categoriesContainer.style.setProperty("--active-index", activeIndex);
    }
  };

  // Function to randomly select a meme template
  const randomizeMemeTemplate = useCallback(() => {
    const allTemplates = Object.values(categorizedMemeTemplates).flat();
    if (allTemplates.length === 0) {
      showToast("No meme templates available.");
      return;
    }

    const randomTemplate = allTemplates[Math.floor(Math.random() * allTemplates.length)];
    const templateCategory = Object.keys(categorizedMemeTemplates).find(category =>
      categorizedMemeTemplates[category].some(template => template.id === randomTemplate.id)
    );

    if (templateCategory) {
      setActiveCategory(templateCategory);
      setActiveId(null);
      setActiveTextId(null);
      setItems([]);
      setTopText("");
      setBottomText("");
      setFont("display");
      setTextColor("#ffffff");
      setStrokeColor("#000000");
      handleTemplateSelect(randomTemplate.id);
      showToast(`Randomized to ${randomTemplate.name}!`);
    }
  }, [showToast, handleTemplateSelect, setItems, setActiveId, setActiveTextId]);

  // Check screen width on mount and resize
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update indicator position when category changes
  useEffect(() => {
    const activeIndex = memeCategories.indexOf(activeCategory);
    const categoriesContainer = document.querySelector(
      ".meme-template-categories"
    );
    if (categoriesContainer && activeIndex >= 0) {
      categoriesContainer.style.setProperty("--active-index", activeIndex);
    }
  }, [activeCategory]);

  // Initialize with a random meme template on page load
  useEffect(() => {
    // Small delay to ensure all templates are loaded
    const timer = setTimeout(() => {
      randomizeMemeTemplate();
    }, 100);

    return () => clearTimeout(timer);
  }, [randomizeMemeTemplate]);

  if (screenWidth < 992) {
    return <ResponsiveMessage screenWidth={screenWidth} />;
  }

  const handleOpenAiModal = () => {
    if (!imageSrc) {
      showToast("Please select a meme template first!");
      return;
    }
    setIsAiModalOpen(true);
  };

  const handleCloseAiModal = (selectedOption) => {
    if (selectedOption && selectedOption.topText && selectedOption.bottomText) {
      // User selected an option from the modal
      setTopText(selectedOption.topText.toUpperCase());
      setBottomText(selectedOption.bottomText.toUpperCase());
      showToast("✨ Meme text applied successfully!");
    }
    setIsAiModalOpen(false);
  };

  const handleAiGenerate = async (topic, isTwitterPost = false) => {
    if (!imageSrc) {
      showToast("Please select a meme template first!");
      setIsAiModalOpen(false);
      return;
    }

    setIsGenerating(true);

    try {
      // Convert the current image to a blob/file for the API
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], 'template.jpg', { type: 'image/jpeg' });

      // Call the API with topic, isTwitterPost flag, and template image
      const result = await memeApiService.generateMemeText(topic, isTwitterPost, file);

      // Return the result so the modal can display the options
      return result;
    } catch (error) {
      console.error('Error generating meme:', error);

      let errorMessage = "Failed to generate meme text. ";
      if (error.message.includes('Failed to fetch')) {
        errorMessage += "Is the backend running on localhost:8001?";
      } else {
        errorMessage += error.message;
      }

      showToast(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseBrandifyModal = (result) => {
    // If user clicked "Use This", apply the branded template
    if (result && result.useBrandedTemplate && result.brandedImage) {
      const base64Image = `data:image/png;base64,${result.brandedImage}`;
      setImageSrc(base64Image);
      showToast("✨ Branded template applied successfully!");
    }
    setIsBrandifyModalOpen(false);
  };

  const handleBrandifyGenerate = async (brandData) => {
    if (!imageSrc) {
      showToast("Please select a meme template first!");
      setIsBrandifyModalOpen(false);
      return null;
    }

    setIsBrandifying(true);

    try {
      // Convert the current image to a blob/file for the API
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], 'template.jpg', { type: 'image/jpeg' });

      // Call the API with brand data and template image
      const result = await memeApiService.generateBrandedTemplate(
        file,
        brandData.brandName,
        brandData.primaryColor,
        brandData.userPrompt,
        brandData.secondaryColor,
        brandData.logoFile
      );

      // Return result to modal for comparison view
      return result;
    } catch (error) {
      console.error('Error generating branded template:', error);

      let errorMessage = "Failed to generate branded template. ";
      if (error.message.includes('Failed to fetch')) {
        errorMessage += "Is the backend running on localhost:8001?";
      } else if (error.message.includes('Rate')) {
        errorMessage += "Rate limit exceeded. Please wait 3 minutes.";
      } else {
        errorMessage += error.message;
      }

      showToast(errorMessage);
      return null;
    } finally {
      setIsBrandifying(false);
    }
  };

  const onUpload = (file) => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight, ratio: img.naturalWidth / img.naturalHeight });
    };
    img.src = url;
  };

  const handleSocialShare = async (platform) => {
    await sharingService.handleSocialShare(platform, {
      canvasRef: stageRef,
      topText,
      bottomText
    });
  };

  return (
    <div className="meme-gen-container">
      <InteractiveGlow />

      <main className="meme-gen-main">
        <header className="meme-gen-header">
          {/* <h1 className="meme-gen-title">Rekt CEO Meme Generator</h1> */}
        </header>

        <section className="meme-gen-grid">
          {/* Left Column - Mint Info & Ready */}
          <MemeSidebar
            isLoading={isLoading}
            onAddSticker={onAddSticker}
            removeAllStickers={removeAllStickers}
          />

          {/* Center Column - Canvas */}
          <MemeCanvas
            stageRef={stageRef}
            items={items}
            textPositions={textPositions}
            activeId={activeId}
            activeTextId={activeTextId}
            handlePointerDown={handlePointerDown}
            handleTextPointerDown={handleTextPointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            handleResizeStart={handleResizeStart}
            handleResizeMove={handleResizeMove}
            handleResizeEnd={handleResizeEnd}
            handleRotateStart={handleRotateStart}
            handleRotateMove={handleRotateMove}
            handleRotateEnd={handleRotateEnd}
            removeSticker={removeSticker}
            setActiveId={setActiveId}
            setActiveTextId={setActiveTextId}

            imageSrc={imageSrc}
            selectedTemplate={selectedTemplate}
            canvasFormat={canvasFormat}
            setCanvasFormat={setCanvasFormat}
            imageDimensions={imageDimensions}
            topText={topText}
            bottomText={bottomText}
            font={font}
            textColor={textColor}
            strokeColor={strokeColor}
            randomizeMemeTemplate={randomizeMemeTemplate}
            handleSocialShare={handleSocialShare}
          />

          {/* Right Column - Controls */}
          <MemeControls
            activeCategory={activeCategory}
            memeCategories={memeCategories}
            handleCategorySwitch={handleCategorySwitch}
            getTemplatesForCategory={getTemplatesForCategory}
            selectedTemplate={selectedTemplate}
            handleTemplateSelect={handleTemplateSelect}
            onUpload={onUpload}
            topText={topText}
            setTopText={setTopText}
            bottomText={bottomText}
            setBottomText={setBottomText}
            font={font}
            setFont={setFont}
            handleOpenAiModal={handleOpenAiModal}
            textColor={textColor}
            setTextColor={setTextColor}
            strokeColor={strokeColor}
            setStrokeColor={setStrokeColor}
            isConnected={isConnected}
            userData={userData}
            imageSrc={imageSrc}
            showToast={showToast}
            stageRef={stageRef}
            setMintPreviewImage={setMintPreviewImage}
            setShowMintConfirm={setShowMintConfirm}
            activeTier={activeTier}
          />

        </section>
      </main>

      {/* AI Generate Modal */}
      <AiGenerateModal
        isOpen={isAiModalOpen}
        onClose={handleCloseAiModal}
        onGenerate={handleAiGenerate}
        isLoading={isGenerating}
      />

      {/* Brandify Modal */}
      <BrandifyModal
        isOpen={isBrandifyModalOpen}
        onClose={handleCloseBrandifyModal}
        onGenerate={handleBrandifyGenerate}
        isLoading={isBrandifying}
        templateSrc={imageSrc}
      />

      {/* Mint Confirmation Modal */}
      <MintConfirmModal
        isOpen={showMintConfirm}
        onClose={() => setShowMintConfirm(false)}
        onConfirm={() => {
          setShowMintConfirm(false);
          setShowMintSuccess(true);
          showToast("🎉 Meme minted successfully!");
        }}
        imagePreview={mintPreviewImage}
        type="MEME"
        pricing={{
          tier: activeTier?.name || "Standard",
          usdPrice: activeTier?.priceUSD ? `$${activeTier.priceUSD}` : "Free",
          ceoPrice: activeTier?.priceCEO ? `${activeTier.priceCEO.toLocaleString()} CEO` : "Priceless",
          currentSupply: activeTier?.minted?.toLocaleString() || "--",
          totalSupply: activeTier?.supply?.toLocaleString() || "10,000"
        }}
        userData={userData}
        isConnected={isConnected}
      />

      {/* Mint Success Modal */}
      <MintSuccessModal
        isOpen={showMintSuccess}
        onClose={() => setShowMintSuccess(false)}
        imagePreview={mintPreviewImage}
        type="MEME"
        onSocialShare={handleSocialShare}
      />
    </div>
  );
};

export default MemeGen;
