import React from 'react';
import ComingSoonButton from '../../components/ComingSoonButton';
// eslint-disable-next-line no-unused-vars
import { exportNodeToPng } from "../../utils/exportImage.js";
import "./memeGen.css";

const MemeControls = ({
    activeCategory,
    memeCategories,
    handleCategorySwitch,
    getTemplatesForCategory,
    selectedTemplate,
    handleTemplateSelect,
    onUpload,
    topText,
    setTopText,
    bottomText,
    setBottomText,
    font,
    setFont,
    handleOpenAiModal,
    textColor,
    setTextColor,
    strokeColor,
    setStrokeColor,
    isConnected,
    userData,
    imageSrc,
    showToast,
    stageRef,
    setMintPreviewImage,
    setShowMintConfirm,
    activeTier
}) => {
    return (
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
                                    <option value="impact">Impact</option>
                                    <option value="arial">Arial</option>
                                    <option value="bebas">Bebas Neue</option>
                                    <option value="chakra">Chakra Petch</option>
                                    <option value="grotesk">Space Grotesk</option>
                                    <option value="lilita">Lilita One</option>
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
                    {isConnected && userData && (
                        <div className="flex flex-row items-center justify-between w-full mb-1 ml-2 mr-1 px-1">
                            <div className="flex flex-row items-center">
                                <span className="text-sm font-medium text-gray-400">Your Balance: </span>
                                <span className="text-md font-bold text-white !ml-0.5">{parseFloat(userData.ceoBalance?.balance || 0).toLocaleString()} CEO</span>
                            </div>
                            <div className="flex flex-row items-center">
                                <span className="text-sm font-medium text-gray-400">Memes Owned: </span>
                                <span className="text-md font-bold text-white !ml-0.5">{userData.mintInfo?.meme.mintCount || 0} / {userData.mintInfo?.meme.maxMint || 0}</span>
                            </div>
                        </div>
                    )}
                    {/* PRODUCTION TODO: Remove <ComingSoonButton> below and uncomment the original button when deploying with production token */}
                    <ComingSoonButton className="story-btn secondary" style={{ width: '100%' }} label="Mint NFT (Coming Soon)" />
                    {/* <button
                        onClick={async () => {
                            //DO NOT DELETE
                            if (!imageSrc) {
                                showToast("Please select a meme template first!");
                                return;
                            }
                            // Capture the canvas as image
                            const preview = await exportNodeToPng(stageRef.current);
                            setMintPreviewImage(preview);
                            setShowMintConfirm(true);
                        }}
                        className="story-btn secondary"
                        style={{ width: '100%' }}
                    >
                        Mint NFT (Coming Soon)
                    </button> */}
                </div>
            </div>
        </div>
    );
};

export default MemeControls;
