import React, { useState } from 'react';
import { MdCropSquare, MdCropPortrait, MdCropLandscape, MdCropFree } from "react-icons/md";
import SocialShareFooter from "../page_components/SocialShareFooter.js";

const MemeCanvas = ({
    stageRef,
    items,
    textPositions,
    activeId,
    activeTextId,
    handlePointerDown,
    handleTextPointerDown,
    handlePointerMove,
    handlePointerUp,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleRotateStart,
    handleRotateMove,
    handleRotateEnd,
    removeSticker,
    setActiveId,
    setActiveTextId,
    imageSrc,
    selectedTemplate,
    canvasFormat,
    setCanvasFormat,
    imageDimensions,
    topText,
    bottomText,
    font,
    textColor,
    strokeColor,
    randomizeMemeTemplate,
    handleSocialShare
}) => {
    const [frameVariant, setFrameVariant] = useState('pink');

    const getParsedRatio = () => {
        if (canvasFormat === 'square') return 1;
        if (canvasFormat === 'portrait') return 4 / 5;
        if (canvasFormat === 'landscape') return 1.91 / 1;
        return imageDimensions.ratio || 1;
    };

    const currentRatio = getParsedRatio();

    return (
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
                    <div className="meme-canvas-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', paddingBlock: '4px' }}>
                            <button
                                onClick={() => setFrameVariant('none')}
                                className={`story-btn icon-only ${frameVariant === 'none' ? 'active' : ''}`}
                                title="No Frame"
                                style={{
                                    width: '32px', height: '32px', minWidth: '32px', padding: 0,
                                    background: frameVariant === 'none' ? 'var(--color-yellow)' : 'transparent',
                                    color: frameVariant === 'none' ? 'black' : 'white',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >✕</button>
                            <button
                                onClick={() => setFrameVariant('yellow')}
                                className={`story-btn icon-only ${frameVariant === 'yellow' ? 'active' : ''}`}
                                title="Yellow Frame"
                                style={{
                                    width: '32px', height: '32px', minWidth: '32px', padding: 0,
                                    background: frameVariant === 'yellow' ? 'var(--color-yellow)' : 'transparent',
                                    color: frameVariant === 'yellow' ? 'black' : 'var(--color-yellow)',
                                    border: '2px solid var(--color-yellow)'
                                }}
                            ></button>
                            <button
                                onClick={() => setFrameVariant('pink')}
                                className={`story-btn icon-only ${frameVariant === 'pink' ? 'active' : ''}`}
                                title="Pink Frame"
                                style={{
                                    width: '32px', height: '32px', minWidth: '32px', padding: 0,
                                    background: frameVariant === 'pink' ? 'var(--color-red)' : 'transparent',
                                    color: frameVariant === 'pink' ? 'white' : 'var(--color-red)',
                                    border: '2px solid var(--color-red)'
                                }}
                            ></button>
                        </div>
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
                        aspectRatio: currentRatio,
                        maxWidth: `min(100%, ${Math.min(540, 540 * currentRatio)}px)`,
                        width: "100%",
                        borderRadius: frameVariant !== 'none' ? '24px' : '12px',
                        border: frameVariant !== 'none' ? 'none' : '2px solid rgba(255, 255, 255, 0.2)'
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

                    {/* Frame Overlay */}
                    {frameVariant !== 'none' && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 2,
                                pointerEvents: 'none',
                                overflow: 'hidden',
                                borderRadius: '24px'
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '8px',
                                    right: '8px',
                                    bottom: '32px',
                                    borderRadius: '12px',
                                    boxShadow: `0 0 0 2000px ${frameVariant === 'yellow' ? 'var(--color-yellow)' : 'var(--color-red)'}`
                                }}
                            />
                        </div>
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
            <SocialShareFooter onSocialShare={handleSocialShare}>
                <button
                    className={`story-btn icon-only ${canvasFormat === 'square' ? 'active' : ''}`}
                    onClick={() => setCanvasFormat('square')}
                    title="Square (1:1)"
                    style={{
                        padding: '8px',
                        width: '36px',
                        height: '36px',
                        minWidth: '36px',
                        background: canvasFormat === 'square' ? 'var(--color-yellow)' : 'rgba(255,255,255,0.1)',
                        color: canvasFormat === 'square' ? 'black' : 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <MdCropSquare size={20} />
                </button>
                <button
                    className={`story-btn icon-only ${canvasFormat === 'portrait' ? 'active' : ''}`}
                    onClick={() => setCanvasFormat('portrait')}
                    title="Portrait (4:5)"
                    style={{
                        padding: '8px',
                        width: '36px',
                        height: '36px',
                        minWidth: '36px',
                        background: canvasFormat === 'portrait' ? 'var(--color-yellow)' : 'rgba(255,255,255,0.1)',
                        color: canvasFormat === 'portrait' ? 'black' : 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <MdCropPortrait size={20} />
                </button>
                <button
                    className={`story-btn icon-only ${canvasFormat === 'landscape' ? 'active' : ''}`}
                    onClick={() => setCanvasFormat('landscape')}
                    title="Landscape (1.91:1)"
                    style={{
                        padding: '8px',
                        width: '36px',
                        height: '36px',
                        minWidth: '36px',
                        background: canvasFormat === 'landscape' ? 'var(--color-yellow)' : 'rgba(255,255,255,0.1)',
                        color: canvasFormat === 'landscape' ? 'black' : 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <MdCropLandscape size={20} />
                </button>
                <button
                    className={`story-btn icon-only ${canvasFormat === 'dynamic' ? 'active' : ''}`}
                    onClick={() => setCanvasFormat('dynamic')}
                    title="Dynamic (Original)"
                    style={{
                        padding: '8px',
                        width: '36px',
                        height: '36px',
                        minWidth: '36px',
                        background: canvasFormat === 'dynamic' ? 'var(--color-yellow)' : 'rgba(255,255,255,0.1)',
                        color: canvasFormat === 'dynamic' ? 'black' : 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <MdCropFree size={20} />
                </button>
            </SocialShareFooter>
        </div>
    );
};

export default MemeCanvas;
