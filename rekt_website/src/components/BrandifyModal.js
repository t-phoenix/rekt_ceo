import { useState } from 'react';
import './BrandifyModal.css';

const BrandifyModal = ({ isOpen, onClose, onGenerate, isLoading, templateSrc }) => {
    const [brandName, setBrandName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#00D4FF');
    const [secondaryColor, setSecondaryColor] = useState('');
    const [userPrompt, setUserPrompt] = useState('');
    const [logoFile, setLogoFile] = useState(null);

    // Comparison mode state
    const [isComparisonMode, setIsComparisonMode] = useState(false);
    const [brandedImageBase64, setBrandedImageBase64] = useState(null);

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert('Please upload a valid image file (JPEG, PNG, or WebP)');
                return;
            }
            setLogoFile(file);
        }
    };

    const handleSubmit = async () => {
        // Validate inputs
        if (!brandName.trim() || brandName.length > 50) {
            alert('Brand name is required and must be 1-50 characters');
            return;
        }
        if (!primaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
            alert('Primary color must be in hex format (e.g., #00D4FF)');
            return;
        }
        if (!userPrompt.trim() || userPrompt.length < 10 || userPrompt.length > 500) {
            alert('User prompt must be 10-500 characters');
            return;
        }
        if (secondaryColor && !secondaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
            alert('Secondary color must be in hex format (e.g., #FF006E)');
            return;
        }

        // Call onGenerate and capture the result
        const result = await onGenerate({
            brandName: brandName.trim(),
            primaryColor,
            secondaryColor: secondaryColor || null,
            userPrompt: userPrompt.trim(),
            logoFile
        });

        // If successful, switch to comparison mode
        if (result && result.brandedTemplateBase64) {
            setBrandedImageBase64(result.brandedTemplateBase64);
            setIsComparisonMode(true);
        }
    };

    const handleUseThis = () => {
        // Pass the branded image to parent to apply as template
        onClose({ useBrandedTemplate: true, brandedImage: brandedImageBase64 });
        resetModal();
    };

    const handleTryAgain = () => {
        // Reset to form mode
        setIsComparisonMode(false);
        setBrandedImageBase64(null);
    };

    const resetModal = () => {
        // Reset all form state
        setBrandName('');
        setPrimaryColor('#00D4FF');
        setSecondaryColor('');
        setUserPrompt('');
        setLogoFile(null);
        setIsComparisonMode(false);
        setBrandedImageBase64(null);
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="brandify-modal-overlay" onClick={handleClose}>
            <div className="brandify-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="brandify-modal-header">
                    <h2 className="brandify-modal-title">
                        🎨 Brandify Your Meme
                    </h2>
                    <button className="brandify-modal-close" onClick={handleClose}>
                        ✕
                    </button>
                </div>

                <div className="brandify-modal-body">
                    {!isComparisonMode ? (
                        <>
                            <p className="brandify-modal-hint">
                                AI will intelligently blend your brand elements into the meme template!
                            </p>

                            <div className="brandify-form">
                                {/* Two Column Layout */}
                                <div className="brandify-two-column">
                                    {/* Left Column - Template Preview */}
                                    <div className="brandify-column-left">
                                        {templateSrc && (
                                            <div className="brandify-form-group">
                                                <label className="brandify-label">Selected Template</label>
                                                <div className="brandify-template-preview">
                                                    <img
                                                        src={templateSrc}
                                                        alt="Selected template"
                                                        className="brandify-preview-image"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column - Brand Name & Logo */}
                                    <div className="brandify-column-right">
                                        {/* Brand Name */}
                                        <div className="brandify-form-group">
                                            <label htmlFor="brand-name" className="brandify-label">
                                                Brand Name <span className="required">*</span>
                                            </label>
                                            <input
                                                id="brand-name"
                                                type="text"
                                                className="brandify-input"
                                                placeholder="e.g., REKT CEO"
                                                value={brandName}
                                                onChange={(e) => setBrandName(e.target.value)}
                                                maxLength={50}
                                                disabled={isLoading}
                                                autoFocus
                                            />
                                            <span className="brandify-hint-text">{brandName.length}/50</span>
                                        </div>

                                        {/* Logo Upload */}
                                        <div className="brandify-form-group">
                                            <label htmlFor="logo-upload" className="brandify-label">
                                                Brand Logo
                                            </label>
                                            <div className="brandify-file-upload">
                                                <input
                                                    id="logo-upload"
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={handleLogoUpload}
                                                    disabled={isLoading}
                                                    className="brandify-file-input"
                                                />
                                                <label htmlFor="logo-upload" className="brandify-file-label">
                                                    {logoFile ? `✓ ${logoFile.name}` : '📁 Upload Logo (Optional)'}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Colors */}
                                <div className="brandify-form-row">
                                    <div className="brandify-form-group">
                                        <label htmlFor="primary-color" className="brandify-label">
                                            Primary Color <span className="required">*</span>
                                        </label>
                                        <div className="brandify-color-input-wrapper">
                                            <input
                                                id="primary-color"
                                                type="color"
                                                className="brandify-color-picker"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                disabled={isLoading}
                                            />
                                            <input
                                                type="text"
                                                className="brandify-color-text"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                placeholder="#00D4FF"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    <div className="brandify-form-group">
                                        <label htmlFor="secondary-color" className="brandify-label">
                                            Secondary Color
                                        </label>
                                        <div className="brandify-color-input-wrapper">
                                            <input
                                                id="secondary-color"
                                                type="color"
                                                className="brandify-color-picker"
                                                value={secondaryColor || '#FF006E'}
                                                onChange={(e) => setSecondaryColor(e.target.value)}
                                                disabled={isLoading}
                                            />
                                            <input
                                                type="text"
                                                className="brandify-color-text"
                                                value={secondaryColor}
                                                onChange={(e) => setSecondaryColor(e.target.value)}
                                                placeholder="#FF006E"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* User Prompt */}
                                <div className="brandify-form-group">
                                    <label htmlFor="user-prompt" className="brandify-label">
                                        How to Blend Brand <span className="required">*</span>
                                    </label>
                                    <textarea
                                        id="user-prompt"
                                        className="brandify-textarea"
                                        placeholder="e.g., make character wear branded hoodie, add logo to background, place brand colors in the scene..."
                                        value={userPrompt}
                                        onChange={(e) => setUserPrompt(e.target.value)}
                                        maxLength={500}
                                        rows={3}
                                        disabled={isLoading}
                                    />
                                    <span className="brandify-hint-text">{userPrompt.length}/500 (min 10)</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="brandify-modal-hint">
                                Compare the original and branded templates below
                            </p>

                            {/* Comparison View */}
                            <div className="brandify-comparison">
                                <div className="brandify-comparison-item">
                                    <label className="brandify-comparison-label">Original</label>
                                    <div className="brandify-comparison-image-wrapper">
                                        <img
                                            src={templateSrc}
                                            alt="Original template"
                                            className="brandify-comparison-image"
                                        />
                                    </div>
                                </div>

                                <div className="brandify-comparison-divider">
                                    <div className="brandify-comparison-arrow">→</div>
                                </div>

                                <div className="brandify-comparison-item">
                                    <label className="brandify-comparison-label">Branded</label>
                                    <div className="brandify-comparison-image-wrapper">
                                        <img
                                            src={`data:image/png;base64,${brandedImageBase64}`}
                                            alt="Branded template"
                                            className="brandify-comparison-image"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="brandify-modal-footer">
                    {!isComparisonMode ? (
                        <>
                            <button
                                className="story-btn secondary"
                                onClick={handleClose}
                                disabled={isLoading}
                                style={{ margin: 0 }}
                            >
                                Cancel
                            </button>
                            <button
                                className="story-btn primary"
                                onClick={handleSubmit}
                                disabled={
                                    !brandName.trim() ||
                                    !userPrompt.trim() ||
                                    userPrompt.length < 10 ||
                                    isLoading
                                }
                                style={{
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="brandify-modal-spinner"></span>
                                        Generating...
                                    </>
                                ) : (
                                    '🎨 Brandify'
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className="story-btn secondary"
                                onClick={handleTryAgain}
                                style={{ margin: 0 }}
                            >
                                ↩️ Try Again
                            </button>
                            <button
                                className="story-btn primary"
                                onClick={handleUseThis}
                                style={{ margin: 0 }}
                            >
                                ✅ Use This
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrandifyModal;
