import React, { useRef, useState } from 'react';
import {
  MdAutoAwesome,
  MdCropSquare,
  MdCropPortrait,
  MdCropLandscape,
  MdCropFree,
  MdShuffle,
  MdLayers,
} from 'react-icons/md';
import SocialShareFooter from '../page_components/SocialShareFooter.js';
import GenerationsPanel from './GenerationsPanel.js';
import '../../styles/aiAssistModal.css';

const FRAME_OPTIONS = [
  { id: 'none', label: 'No frame', glyph: '✕' },
  { id: 'yellow', label: 'Yellow frame', glyph: null, color: 'var(--color-yellow)' },
  { id: 'red', label: 'Red frame', glyph: null, color: 'var(--color-red)' },
];

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
  handleSocialShare,
  frameVariant,
  setFrameVariant,
  onOpenAiAssist,
  aiAssistPriceLabel,
  onOpenBrandify,
  variationsCount,
  variationsLoading,
  templateName,
  templateGenerations,
  sessionGenerations,
  communityVariations,
  onSelectGeneration,
}) => {
  const generationsAnchorRef = useRef(null);
  const [generationsOpen, setGenerationsOpen] = useState(false);
  const [generationsTab, setGenerationsTab] = useState('template');

  const getParsedRatio = () => {
    if (canvasFormat === 'square') return 1;
    if (canvasFormat === 'portrait') return 4 / 5;
    if (canvasFormat === 'landscape') return 1.91 / 1;
    return imageDimensions.ratio || 1;
  };

  const currentRatio = getParsedRatio();

  const sessionGenCount = sessionGenerations?.length || 0;
  const templateGenCount = (templateGenerations?.length || 0) + (variationsCount || 0);
  const totalGenerationsCount = sessionGenCount + (communityVariations?.total || variationsCount || 0);
  const hasGenerations = totalGenerationsCount > 0 || sessionGenCount > 0 || templateGenCount > 0;

  const generationsTooltip = variationsLoading
    ? 'Loading generations…'
    : hasGenerations
      ? `Generations (${sessionGenCount} session · ${templateGenCount} this meme)`
      : 'Review brandify generations for this meme and session';

  const handleToggleGenerations = () => {
    setGenerationsOpen((open) => !open);
  };

  const handleSelectGeneration = (item) => {
    onSelectGeneration?.(item);
    setGenerationsOpen(false);
  };

  const aiAssistDisabled = !imageSrc;
  const aiAssistTooltip = aiAssistDisabled
    ? 'Select or upload a meme first'
    : 'AI Assist — captions or brandify';

  return (
    <div className="meme-canvas-card">
      <div className="meme-canvas-header">
        <div className="meme-canvas-header-row">
          <h3 className="meme-canvas-title">Meme Preview</h3>

          <div className="meme-canvas-actions">
            <div className="meme-canvas-toolbar-group meme-canvas-toolbar-group--frames">
              {FRAME_OPTIONS.map((frame) => (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => setFrameVariant(frame.id)}
                  className={`meme-canvas-frame-btn ${frameVariant === frame.id ? 'active' : ''}`}
                  title={frame.label}
                  aria-label={frame.label}
                  data-frame={frame.id}
                >
                  {frame.glyph ? (
                    <span>{frame.glyph}</span>
                  ) : (
                    <span className="meme-canvas-frame-swatch" style={{ borderColor: frame.color }} />
                  )}
                </button>
              ))}
            </div>

            <div className="meme-canvas-toolbar-group meme-canvas-toolbar-group--generations">
              <button
                type="button"
                onClick={randomizeMemeTemplate}
                className="meme-canvas-icon-btn"
                title="Randomize template"
                aria-label="Randomize template"
              >
                <MdShuffle size={18} />
              </button>
              <div className="meme-canvas-generations-anchor" ref={generationsAnchorRef}>
                <button
                  type="button"
                  onClick={handleToggleGenerations}
                  className={`meme-canvas-icon-btn meme-canvas-icon-btn--variations ${hasGenerations ? 'has-count' : ''} ${generationsOpen ? 'is-open' : ''}`}
                  title={generationsTooltip}
                  aria-label={generationsTooltip}
                  aria-expanded={generationsOpen}
                  data-count={
                    (sessionGenCount + templateGenCount) > 99
                      ? '99+'
                      : sessionGenCount + templateGenCount || variationsCount || ''
                  }
                >
                  <MdLayers size={18} />
                </button>
                <GenerationsPanel
                  isOpen={generationsOpen}
                  onClose={() => setGenerationsOpen(false)}
                  activeTab={generationsTab}
                  onTabChange={setGenerationsTab}
                  templateName={templateName}
                  templateGenerations={templateGenerations}
                  sessionGenerations={sessionGenerations}
                  communityVariations={communityVariations}
                  variationsLoading={variationsLoading}
                  activeImageSrc={imageSrc}
                  onSelectGeneration={handleSelectGeneration}
                  onCreateOwn={onOpenBrandify}
                  anchorRef={generationsAnchorRef}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAiAssist}
              className="story-btn primary meme-ai-assist-btn"
              disabled={aiAssistDisabled}
              title={aiAssistTooltip}
            >
              <MdAutoAwesome size={18} aria-hidden="true" />
              <span>AI Assist</span>
              {/* {aiAssistPriceLabel && (
                <span className="meme-ai-pay-badge" aria-label={`from ${aiAssistPriceLabel} USDC`}>
                  <span className="meme-ai-pay-badge-inner">
                    <span className="meme-ai-pay-coin">◎</span>
                    <span className="meme-ai-pay-amount">{aiAssistPriceLabel.replace(/^\$/, '')}</span>
                    <span className="meme-ai-pay-unit">+</span>
                  </span>
                </span>
              )} */}
            </button>
          </div>
        </div>
      </div>

      <div className="meme-canvas-content">
        <div
          ref={stageRef}
          onPointerDown={(e) => {
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
          className={`meme-canvas-stage ${imageSrc ? 'has-image' : ''}`}
          style={{
            aspectRatio: currentRatio,
            borderRadius: frameVariant !== 'none' ? '20px' : '20px',
            border: frameVariant !== 'none' ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {frameVariant !== 'none' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                backgroundColor: frameVariant === 'yellow' ? 'var(--color-yellow)' : 'var(--color-red)',
                borderRadius: '20px',
              }}
            />
          )}

          {imageSrc && (
            <img
              key={selectedTemplate || 'bg'}
              src={imageSrc}
              alt=""
              draggable={false}
              className="meme-canvas-background"
              style={
                frameVariant !== 'none'
                  ? {
                      top: '8px',
                      left: '8px',
                      width: 'calc(100% - 16px)',
                      height: 'calc(100% - 28px)',
                      borderRadius: '12px',
                      zIndex: 1,
                    }
                  : {
                      top: '0',
                      left: '0',
                      width: '100%',
                      height: '100%',
                      borderRadius: '12px',
                      zIndex: 1,
                    }
              }
            />
          )}

          <div
            className={`meme-text top font-${font}`}
            style={{
              color: textColor,
              WebkitTextStrokeColor: strokeColor,
              left: `${textPositions.top.x * 100}%`,
              top: `${textPositions.top.y * 100}%`,
              transform: `translate(-50%, -50%) scale(${textPositions.top.scale})`,
              cursor: 'move',
              position: 'absolute',
              zIndex: 5,
            }}
            onPointerDown={handleTextPointerDown('top')}
          >
            <span style={{ WebkitTextStrokeColor: strokeColor }}>{topText}</span>
            <div className="text-resize-handle" onPointerDown={(e) => handleResizeStart('text', 'top', e)} />
          </div>

          {items.map((it) => (
            <div
              key={it.id}
              onPointerDown={handlePointerDown(it.id)}
              className="meme-sticker"
              style={{
                left: it.x,
                top: it.y,
                transform: `scale(${it.scale}) rotate(${it.rotation}deg)`,
              }}
            >
              <img
                src={it.image}
                alt={it.name}
                draggable="false"
                onDragStart={(e) => e.preventDefault()}
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
              />
              <button className="sticker-delete-btn" onClick={() => removeSticker(it.id)} title="Remove sticker">
                ✕
              </button>
              <div className="sticker-resize-handle" onPointerDown={(e) => handleResizeStart('sticker', it.id, e)} />
              <div className="sticker-rotate-handle" onPointerDown={(e) => handleRotateStart('sticker', it.id, e)} />
              <div className="sticker-rotation-indicator">{Math.round(it.rotation)}°</div>
            </div>
          ))}

          <div
            className={`meme-text bottom font-${font}`}
            style={{
              color: textColor,
              left: `${textPositions.bottom.x * 100}%`,
              bottom: `${(1 - textPositions.bottom.y) * 100}%`,
              transform: `translate(-50%, 50%) scale(${textPositions.bottom.scale})`,
              cursor: 'move',
              position: 'absolute',
              zIndex: 5,
            }}
            onPointerDown={handleTextPointerDown('bottom')}
          >
            <span style={{ WebkitTextStrokeColor: strokeColor }}>{bottomText}</span>
            <div className="text-resize-handle" onPointerDown={(e) => handleResizeStart('text', 'bottom', e)} />
          </div>
        </div>
      </div>

      <SocialShareFooter onSocialShare={handleSocialShare}>
        <button
          className={`story-btn icon-only ${canvasFormat === 'square' ? 'active' : ''}`}
          onClick={() => setCanvasFormat('square')}
          title="Square (1:1)"
          style={{
            padding: '8px',
            width: '32px',
            height: '32px',
            minWidth: '32px',
            background: canvasFormat === 'square' ? 'var(--color-yellow)' : 'rgba(255,255,255,0.1)',
            color: canvasFormat === 'square' ? 'black' : 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            cursor: 'pointer',
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
            width: '32px',
            height: '32px',
            minWidth: '32px',
            background: canvasFormat === 'portrait' ? 'var(--color-yellow)' : 'rgba(255,255,255,0.1)',
            color: canvasFormat === 'portrait' ? 'black' : 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            cursor: 'pointer',
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
            width: '32px',
            height: '32px',
            minWidth: '32px',
            background: canvasFormat === 'landscape' ? 'var(--color-yellow)' : 'rgba(255,255,255,0.1)',
            color: canvasFormat === 'landscape' ? 'black' : 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            cursor: 'pointer',
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
            width: '32px',
            height: '32px',
            minWidth: '32px',
            background: canvasFormat === 'dynamic' ? 'var(--color-yellow)' : 'rgba(255,255,255,0.1)',
            color: canvasFormat === 'dynamic' ? 'black' : 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          <MdCropFree size={20} />
        </button>
      </SocialShareFooter>
    </div>
  );
};

export default MemeCanvas;
