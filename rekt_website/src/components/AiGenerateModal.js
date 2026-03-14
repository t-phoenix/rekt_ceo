import { useCallback, useEffect, useRef, useState } from 'react';
import './AiGenerateModal.css';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const AiGenerateModal = ({ isOpen, onClose, onGenerate, isLoading }) => {
    const [inputMode, setInputMode] = useState('topic'); // 'topic' or 'content'
    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [generatedOptions, setGeneratedOptions] = useState(null); // Will store the 3 options
    const modalContentRef = useRef(null);
    const previouslyFocusedElementRef = useRef(null);
    const modalTitleId = 'ai-generate-modal-title';

    const handleSubmit = async () => {
        const inputValue = inputMode === 'topic' ? topic : content;
        if (inputValue.trim()) {
            const isTwitterPost = inputMode === 'content';
            const result = await onGenerate(inputValue.trim(), isTwitterPost);

            // Store the options for display
            if (result && result.options) {
                setGeneratedOptions(result);
            }
        }
    };

    const handleSelectOption = (option) => {
        // Pass the selected option back to parent
        onClose({
            topText: option.top_text,
            bottomText: option.bottom_text,
            metadata: option
        });

        // Reset state
        setGeneratedOptions(null);
        setTopic('');
        setContent('');
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && inputMode === 'topic' && topic.trim() && !isLoading) {
            handleSubmit();
        }
    };

    const toggleInputMode = () => {
        setInputMode(prev => prev === 'topic' ? 'content' : 'topic');
    };

    const handleClose = useCallback(() => {
        setGeneratedOptions(null);
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        previouslyFocusedElementRef.current = document.activeElement;

        const modal = modalContentRef.current;
        if (modal) {
            const autoFocusElement = modal.querySelector('[autofocus]');
            if (autoFocusElement instanceof HTMLElement) {
                autoFocusElement.focus();
            } else {
                modal.focus();
            }
        }

        const handleModalKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleClose();
                return;
            }

            if (e.key !== 'Tab') return;

            const currentModal = modalContentRef.current;
            if (!currentModal) return;

            const focusableElements = Array.from(
                currentModal.querySelectorAll(FOCUSABLE_SELECTOR)
            );

            if (focusableElements.length === 0) {
                e.preventDefault();
                currentModal.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (!currentModal.contains(activeElement)) {
                e.preventDefault();
                firstElement.focus();
                return;
            }

            if (e.shiftKey) {
                if (activeElement === firstElement || activeElement === currentModal) {
                    e.preventDefault();
                    lastElement.focus();
                }
                return;
            }

            if (activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleModalKeyDown);

        return () => {
            document.removeEventListener('keydown', handleModalKeyDown);

            if (
                previouslyFocusedElementRef.current instanceof HTMLElement &&
                document.contains(previouslyFocusedElementRef.current)
            ) {
                previouslyFocusedElementRef.current.focus();
            }
        };
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    return (
        <div className="ai-modal-overlay" onClick={handleClose}>
            <div
                ref={modalContentRef}
                className="ai-modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby={modalTitleId}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="ai-modal-header">
                    <h2 id={modalTitleId} className="ai-modal-title">
                        {generatedOptions ? '✨ Choose Your Favorite' : '✨ AI Meme Generator'}
                    </h2>
                    <button className="ai-modal-close" onClick={handleClose} aria-label="Close AI meme generator modal">
                        ✕
                    </button>
                </div>

                {!generatedOptions ? (
                    <>
                        <div className="ai-modal-body">
                            <div className="ai-modal-input-header">
                                <label htmlFor="input-field" className="ai-modal-label">
                                    {inputMode === 'topic' ? "What's your meme about?" : "Enter your content"}
                                </label>
                                <button
                                    className="ai-toggle-btn"
                                    onClick={toggleInputMode}
                                    disabled={isLoading}
                                    title={`Switch to ${inputMode === 'topic' ? 'content' : 'topic'} mode`}
                                >
                                    {inputMode === 'topic' ? '📝 Switch to Content' : '💡 Switch to Topic'}
                                </button>
                            </div>

                            {inputMode === 'topic' ? (
                                <input
                                    id="input-field"
                                    type="text"
                                    className="ai-modal-input"
                                    placeholder="e.g., crypto market crash, NFT hype, diamond hands..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    onKeyDown={handleInputKeyDown}
                                    disabled={isLoading}
                                    autoFocus
                                />
                            ) : (
                                <textarea
                                    id="input-field"
                                    className="ai-modal-textarea"
                                    placeholder="e.g., Just saw Bitcoin hit $100k and my portfolio is still in the red. Story of my life! 📉😭"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    disabled={isLoading}
                                    rows={3}
                                    autoFocus
                                />
                            )}

                            <p className="ai-modal-hint">
                                {inputMode === 'topic'
                                    ? 'Enter a topic or theme and let AI generate viral meme text for you!'
                                    : 'Paste your pre-written content (like a Twitter post) and AI will generate meme text from it!'
                                }
                            </p>
                        </div>

                        <div className="ai-modal-footer">
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
                                    (inputMode === 'topic' && !topic.trim()) ||
                                    (inputMode === 'content' && !content.trim()) ||
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
                                        <span className="ai-modal-spinner"></span>
                                        Generating...
                                    </>
                                ) : (
                                    '🚀 Generate Text'
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="ai-modal-body ai-options-body">
                            <p className="ai-modal-hint" style={{ marginBottom: '1rem' }}>
                                Click on your favorite option to use it in your meme!
                            </p>
                            <div className="ai-options-grid">
                                {generatedOptions.options.map((option, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="ai-option-card"
                                        onClick={() => handleSelectOption(option)}
                                    >
                                        <div className="ai-option-rank-badge">#{index + 1}</div>

                                        <div className="ai-option-content">
                                            <div className="ai-option-meme-preview">
                                                <div className="ai-option-top">{option.top_text}</div>
                                                <div className="ai-option-bottom">{option.bottom_text}</div>
                                            </div>

                                            <div className="ai-option-metadata">
                                                <div className="ai-option-meta-item">
                                                    <span className="meta-icon">🎯</span>
                                                    <span className="meta-value">{(option.ranking_score * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="ai-option-meta-item">
                                                    <span className="meta-icon">😄</span>
                                                    <span className="meta-value">{option.humor_pattern_used.replace(/_/g, ' ')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="ai-modal-footer">
                            <button
                                className="story-btn secondary"
                                onClick={() => setGeneratedOptions(null)}
                                style={{ margin: 0 }}
                            >
                                ← Back
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AiGenerateModal;
