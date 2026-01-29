import { useRef, useState, useEffect, useCallback } from "react";
import "./memeGen.css";
import "../landingpage/styles/story.css";
import InteractiveGlow from "../components/InteractiveGlow.js";
import StickerCard from "./page_components/StickerCard.js";
import { categorizedMemeTemplates, memeCategories } from "../constants/memeData";
import SocialShareFooter from "./page_components/SocialShareFooter.js";
import sharingService from "../services/SharingService.js";
import AiGenerateModal from "../components/AiGenerateModal.js";
import BrandifyModal from "../components/BrandifyModal.js";
import MintConfirmModal from "../components/MintConfirmModal.js";
import MintSuccessModal from "../components/MintSuccessModal.js";
import memeApiService from "../services/MemeApiService.js";




const MemeGen = () => {
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [font, setFont] = useState("display");
  const [textColor, setTextColor] = useState("#ffffff");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [imageSrc, setImageSrc] = useState(null);
  const [activeCategory, setActiveCategory] = useState(memeCategories[0] || "");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // AI modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Brandify modal state
  const [isBrandifyModalOpen, setIsBrandifyModalOpen] = useState(false);
  const [isBrandifying, setIsBrandifying] = useState(false);

  // Mint modal state
  const [showMintConfirm, setShowMintConfirm] = useState(false);
  const [showMintSuccess, setShowMintSuccess] = useState(false);


  // sticker instances on canvas
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // text positioning and sizing state
  const [textPositions, setTextPositions] = useState({
    top: { x: 0.5, y: 0.1, scale: 1 },
    bottom: { x: 0.5, y: 0.90, scale: 1 }
  });
  const [activeTextId, setActiveTextId] = useState(null);

  // resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeTarget, setResizeTarget] = useState(null);
  const [resizeStartScale, setResizeStartScale] = useState(1);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);

  // rotation state
  const [isRotating, setIsRotating] = useState(false);
  const [rotateTarget, setRotateTarget] = useState(null);
  const [rotateStartAngle, setRotateStartAngle] = useState(0);
  const [rotateStartY, setRotateStartY] = useState(0);
  const [rotateStartX, setRotateStartX] = useState(0);

  const stageRef = useRef(null);

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
  }, [showToast, handleTemplateSelect]);

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

  // Show responsive message for small screens
  if (screenWidth < 992) {
    return (
      <div className="responsive-message-container">
        <div className="responsive-message-card">
          <div className="responsive-message-icon">💻</div>
          <h1 className="responsive-message-title">CEO of Responsiveness</h1>
          <p className="responsive-message-subtitle">
            Our dev team is currently experiencing a severe shortage of coffee and sleep,
            which has resulted in this masterpiece being desktop-exclusive.
          </p>
          <div className="responsive-message-requirements">
            <div className="requirement-item">
              <span className="requirement-icon">📱</span>
              <span>Current: {screenWidth}px</span>
            </div>
            <div className="requirement-item">
              <span className="requirement-icon">💻</span>
              <span>Required: 992px+</span>
            </div>
          </div>
          <p className="responsive-message-footer">
            Please fire up your laptop or desktop for the full REKT CEO experience. 🚀
            We welcome all devs to join the team and help us build the future of memes. 🏗️
          </p>
        </div>
      </div>
    );
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
  };

  const onAddSticker = (s) => {
    setItems((prev) => [
      ...prev,
      {
        id: `${s.id}-${crypto.randomUUID()}`,
        x: 40 + prev.length * 16,
        y: 40 + prev.length * 16,
        image: s.image,
        name: s.name,
        scale: 1,
        rotation: 0,
      },
    ]);
  };

  const handlePointerDown = (id) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveId(id);
    e.target.setPointerCapture(e.pointerId);
  };

  const handleTextPointerDown = (textId) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTextId(textId);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if ((!activeId && !activeTextId) || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 16;
    const y = e.clientY - rect.top - 16;

    if (activeId) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === activeId
            ? {
              ...it,
              x: Math.max(0, Math.min(rect.width - 32, x)),
              y: Math.max(0, Math.min(rect.height - 32, y)),
            }
            : it
        )
      );
    }

    if (activeTextId) {
      setTextPositions((prev) => ({
        ...prev,
        [activeTextId]: {
          ...prev[activeTextId],
          x: Math.max(0, Math.min(1, x / rect.width)),
          y: Math.max(0, Math.min(1, y / rect.height)),
        }
      }));
    }
  };

  const handlePointerUp = () => {
    setActiveId(null);
    setActiveTextId(null);
  };



  const handleResizeStart = (targetType, targetId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeTarget({ type: targetType, id: targetId });

    if (targetType === 'text') {
      setResizeStartScale(textPositions[targetId].scale);
    } else if (targetType === 'sticker') {
      const sticker = items.find(item => item.id === targetId);
      setResizeStartScale(sticker.scale);
    }
    setResizeStartY(e.clientY);
    setResizeStartX(e.clientX);
  };

  const handleResizeMove = (e) => {
    if (!isResizing || !resizeTarget) return;

    const deltaY = e.clientY - resizeStartY;
    const deltaX = e.clientX - resizeStartX;

    // Since resize handle is at bottom-right corner:
    // - Dragging southeast (down-right) should increase size
    // - Dragging northwest (up-left) should decrease size
    // We combine both X and Y movement for intuitive diagonal resizing
    const scaleDelta = (deltaY + deltaX) * 0.003; // Combined movement for natural feel
    const newScale = Math.max(0.5, Math.min(2, resizeStartScale + scaleDelta));

    if (resizeTarget.type === 'text') {
      setTextPositions((prev) => ({
        ...prev,
        [resizeTarget.id]: {
          ...prev[resizeTarget.id],
          scale: newScale
        }
      }));
    } else if (resizeTarget.type === 'sticker') {
      setItems((prev) =>
        prev.map((item) =>
          item.id === resizeTarget.id
            ? { ...item, scale: newScale }
            : item
        )
      );
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeTarget(null);
    setResizeStartScale(1);
    setResizeStartY(0);
    setResizeStartX(0);
  };

  const handleRotateStart = (targetType, targetId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRotating(true);
    setRotateTarget({ type: targetType, id: targetId });

    if (targetType === 'sticker') {
      const sticker = items.find(item => item.id === targetId);
      setRotateStartAngle(sticker.rotation || 0);
    }
    setRotateStartY(e.clientY);
    setRotateStartX(e.clientX);
  };

  const handleRotateMove = (e) => {
    if (!isRotating || !rotateTarget) return;

    const rect = stageRef.current.getBoundingClientRect();
    const sticker = items.find(item => item.id === rotateTarget.id);

    if (!sticker) return;

    // Calculate center of sticker
    const stickerCenterX = sticker.x + 24; // 24 is half of max sticker size (48px)
    const stickerCenterY = sticker.y + 24;

    // Calculate mouse position relative to sticker center
    const mouseX = e.clientX - rect.left - stickerCenterX;
    const mouseY = e.clientY - rect.top - stickerCenterY;

    // Calculate current angle from center to mouse
    const currentAngle = Math.atan2(mouseY, mouseX) * (180 / Math.PI);

    // Calculate start angle from center to initial mouse position
    const startAngle = Math.atan2(rotateStartY - rect.top - stickerCenterY, rotateStartX - rect.left - stickerCenterX) * (180 / Math.PI);

    // Calculate the difference and apply to start rotation
    let deltaAngle = currentAngle - startAngle;

    // Handle angle wrapping for smooth rotation
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    // Apply rotation
    const newRotation = (rotateStartAngle + deltaAngle) % 360;

    if (rotateTarget.type === 'sticker') {
      setItems((prev) =>
        prev.map((item) =>
          item.id === rotateTarget.id
            ? { ...item, rotation: newRotation }
            : item
        )
      );
    }
  };

  const handleRotateEnd = () => {
    setIsRotating(false);
    setRotateTarget(null);
    setRotateStartAngle(0);
    setRotateStartY(0);
    setRotateStartX(0);
  };

  const removeAllStickers = () => {
    setItems([]);
    setActiveId(null);
    showToast("All stickers removed!");
  };

  const removeSticker = (stickerId) => {
    setItems(items.filter(item => item.id !== stickerId));
    if (activeId === stickerId) {
      setActiveId(null);
    }
    showToast("Sticker removed!");
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
          <div className="meme-left-column">


            {/* Mint Info */}
            <div className="meme-mint-card">
              <div className="meme-mint-header">
                <h3 className="meme-mint-title">REKT CEO MEME COLLECTION</h3>
              </div>
              <div className="meme-mint-content">
                <div className="meme-mint-grid">
                  <div className="meme-mint-item">
                    <div className="meme-mint-label">Total supply</div>
                    <div className="meme-mint-value">10,000</div>
                  </div>
                  <div className="meme-mint-item">
                    <div className="meme-mint-label">Current supply</div>
                    <div className="meme-mint-value">--</div>
                  </div>
                  <div className="meme-mint-item">
                    <div className="meme-mint-label">Current price (CEO)</div>
                    <div className="meme-mint-value">priceless</div>
                  </div>
                </div>
              </div>
            </div>

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

          {/* Center Column - Canvas */}
          <div className="meme-canvas-card">
            <div className="meme-canvas-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h3 className="meme-canvas-title">Meme Preview</h3>
                <div className="meme-canvas-actions">
                  {/* <button onClick={handleOpenBrandifyModal} className="story-btn secondary meme-canvas-button">
                    🎨 Brandify
                  </button> */}
                  <button
                    onClick={randomizeMemeTemplate}
                    className="story-btn secondary meme-canvas-primary"
                  >
                    🔮 Randomize
                  </button>
                </div>
              </div>
            </div>
            <div className="meme-canvas-content">
              <div
                ref={stageRef}
                onPointerDown={(e) => {
                  // If clicking on the canvas itself (not on a sticker or text), release any active drag
                  if (e.target === e.currentTarget) {
                    setActiveId(null);
                    setActiveTextId(null);
                  }
                }}
                onPointerMove={(e) => {
                  handlePointerMove(e);
                  handleResizeMove(e);
                  handleRotateMove(e);
                }}
                onPointerUp={(e) => {
                  handlePointerUp(e);
                  handleResizeEnd(e);
                  handleRotateEnd(e);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                className={`meme-canvas-stage ${imageSrc ? "has-image" : ""}`}
                style={{
                }}
              >
                {imageSrc && (
                  <img
                    key={selectedTemplate || 'bg'}
                    src={imageSrc}
                    alt=""
                    draggable={false}
                    className="meme-canvas-background"
                  />
                )}
                {/* Top Text */}
                <div
                  className={`meme-text top ${font === "display"
                    ? "font-display"
                    : font === "tech"
                      ? "font-tech"
                      : "font-brand"
                    }`}
                  style={{
                    color: textColor,
                    WebkitTextStrokeColor: strokeColor,
                    left: `${textPositions.top.x * 100}%`,
                    top: `${textPositions.top.y * 100}%`,
                    transform: `translate(-50%, -50%) scale(${textPositions.top.scale})`,
                    cursor: 'move',
                    position: 'absolute',
                    zIndex: 5
                  }}
                  onPointerDown={handleTextPointerDown('top')}
                >
                  <span style={{ WebkitTextStrokeColor: strokeColor }}>
                    {topText}
                  </span>
                  <div
                    className="text-resize-handle"
                    onPointerDown={(e) => handleResizeStart('text', 'top', e)}
                  />
                </div>

                {/* Stickers */}
                {items.map((it) => (
                  <div
                    key={it.id}
                    onPointerDown={handlePointerDown(it.id)}
                    className="meme-sticker"
                    style={{
                      left: it.x,
                      top: it.y,
                      transform: `scale(${it.scale}) rotate(${it.rotation}deg)`
                    }}
                  >
                    <img
                      src={it.image}
                      alt={it.name}
                      draggable="false"
                      onDragStart={(e) => e.preventDefault()}
                      style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                    />
                    <button
                      className="sticker-delete-btn"
                      onClick={() => removeSticker(it.id)}
                      title="Remove sticker"
                    >
                      ✕
                    </button>
                    <div
                      className="sticker-resize-handle"
                      onPointerDown={(e) => handleResizeStart('sticker', it.id, e)}
                    />
                    <div
                      className="sticker-rotate-handle"
                      onPointerDown={(e) => handleRotateStart('sticker', it.id, e)}
                    />
                    <div className="sticker-rotation-indicator">
                      {Math.round(it.rotation)}°
                    </div>
                  </div>
                ))}

                {/* Bottom Text */}
                <div
                  className={`meme-text bottom ${font === "display"
                    ? "font-display"
                    : font === "tech"
                      ? "font-tech"
                      : "font-brand"
                    }`}
                  style={{
                    color: textColor,
                    left: `${textPositions.bottom.x * 100}%`,
                    bottom: `${(1 - textPositions.bottom.y) * 100}%`,
                    transform: `translate(-50%, 50%) scale(${textPositions.bottom.scale})`,
                    cursor: 'move',
                    position: 'absolute',
                    zIndex: 5
                  }}
                  onPointerDown={handleTextPointerDown('bottom')}
                >
                  <span style={{ WebkitTextStrokeColor: strokeColor }}>
                    {bottomText}
                  </span>
                  <div
                    className="text-resize-handle"
                    onPointerDown={(e) => handleResizeStart('text', 'bottom', e)}
                  />
                </div>
              </div>

            </div>
            {/* Social Share Footer */}
            <SocialShareFooter onSocialShare={handleSocialShare} />
          </div>

          {/* Right Column - Controls */}
          <div className="right-column">
            <div className="meme-controls-card">
              <div className="meme-controls-header">
                <h3 className="meme-controls-title">Controls</h3>
              </div>
              <div className="meme-controls-content">
                <div className="meme-control-group">


                  {/* Meme Template Selection */}
                  <div className="meme-control-item">
                    <label className="meme-label">Meme Templates</label>

                    {/* Template Categories Navigation */}
                    <div className="meme-template-categories-wrapper">
                      <div className="scroll-hint left">‹</div>
                      <div className="meme-template-categories">
                        {memeCategories.map(
                          (category) => (
                            <button
                              key={category}
                              className={`meme-category-btn ${activeCategory === category ? "active" : ""
                                }`}
                              onClick={() => handleCategorySwitch(category)}
                            >
                              {category}
                            </button>
                          )
                        )}
                      </div>
                      <div className="scroll-hint right">›</div>
                    </div>

                    {/* Template Grid with Horizontal Scroll */}
                    <div className="meme-template-container-wrapper">
                      <div className="scroll-hint left">‹</div>
                      <div className="meme-template-container">
                        <div className="meme-template-grid">
                          {getTemplatesForCategory(activeCategory).map(
                            (template) => (
                              <div
                                key={template.id}
                                className={`meme-template-item ${selectedTemplate === template.id ? "selected" : ""
                                  }`}
                                onClick={() => handleTemplateSelect(template.id)}
                              >
                                <img
                                  src={template.src}
                                  alt={template.name}
                                  loading="lazy"
                                  className="meme-template-image"
                                />
                              </div>
                            )
                          )}
                        </div>
                      </div>
                      <div className="scroll-hint right">›</div>
                    </div>
                  </div>

                  <div className="meme-control-row">
                    <div className="meme-control-item">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files && onUpload(e.target.files[0])}
                        className="meme-file-input"
                      />
                    </div>
                  </div>


                  <div className="meme-control-row">
                    <div className="meme-control-item">
                      <label htmlFor="top" className="meme-label">
                        Top text
                      </label>
                      <input
                        id="top"
                        placeholder="TOP TEXT"
                        value={topText}
                        onChange={(e) => setTopText(e.target.value.toUpperCase())}
                        className="meme-input"
                      />
                    </div>
                    <div className="meme-control-item">
                      <label htmlFor="bottom" className="meme-label">
                        Bottom text
                      </label>
                      <input
                        id="bottom"
                        placeholder="BOTTOM TEXT"
                        value={bottomText}
                        onChange={(e) =>
                          setBottomText(e.target.value.toUpperCase())
                        }
                        className="meme-input"
                      />
                    </div>
                  </div>

                  <div className="meme-control-row">
                    <div className="meme-control-item">
                      <label className="meme-label">Font</label>
                      <select
                        value={font}
                        onChange={(e) => setFont(e.target.value)}
                        className="meme-select"
                      >
                        <option value="display">Bebas Neue</option>
                        <option value="tech">Chakra Petch</option>
                        <option value="brand">Space Grotesk</option>
                      </select>
                    </div>
                    <div className="meme-control-item">
                      <label className="meme-label">AI assist</label>
                      <button
                        onClick={handleOpenAiModal}
                        className="story-btn primary"
                        style={{ width: "100%" }}
                      >
                        ✨ AI Suggest
                      </button>
                    </div>
                  </div>

                  <div className="meme-control-row">
                    <div className="meme-control-item">
                      <label className="meme-label">Text color</label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="meme-color-input"
                      />
                    </div>
                    <div className="meme-control-item">
                      <label className="meme-label">Outline</label>
                      <input
                        type="color"
                        value={strokeColor}
                        onChange={(e) => setStrokeColor(e.target.value)}
                        className="meme-color-input"
                      />
                    </div>
                  </div>

                  {/* Ready Section */}
                </div>
              </div>
            </div>

            <div className="meme-ready-card">
              <div className="meme-ready-header">
                <h3 className="meme-ready-title">Ready to Own Your MEMEs?</h3>
              </div>
              <div className="meme-ready-content">
                {/* <p className="meme-ready-text">Mint your meme to show the world the CEO of rekt you truly are.</p> */}
                <button
                  onClick={async () => {
                    //DO NOT DELETE
                    // if (!imageSrc) {
                    //   showToast("Please select a meme template first!");
                    //   return;
                    // }
                    // // Capture the canvas as image
                    // const preview = await exportNodeToPng(stageRef.current);
                    // setMintPreviewImage(preview);
                    // setShowMintConfirm(true);
                  }}
                  className="story-btn secondary"
                  style={{ width: '100%' }}
                >
                  Mint NFT (Coming Soon)
                </button>
              </div>
            </div>
          </div>


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
        imagePreview={null}
        type="MEME"
        pricing={{
          tier: "Standard",
          usdPrice: "Free",
          ceoPrice: "Priceless",
          currentSupply: "--",
          totalSupply: "10,000"
        }}
      />

      {/* Mint Success Modal */}
      <MintSuccessModal
        isOpen={showMintSuccess}
        onClose={() => setShowMintSuccess(false)}
        imagePreview={null}
        type="MEME"
        onSocialShare={handleSocialShare}
      />
    </div>
  );
};

export default MemeGen;
