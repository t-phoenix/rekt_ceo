import { MdClose, MdCollections } from 'react-icons/md';
import '../styles/aiAssistModal.css';

const VariationsModal = ({
  isOpen,
  onClose,
  templateName,
  variations,
  onUseVariation,
  onCreateOwn,
}) => {
  if (!isOpen || !variations?.items?.length) return null;

  const formatDate = (ts) => {
    try {
      return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="ai-assist-overlay" onClick={onClose}>
      <div className="ai-assist-modal variations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-assist-header">
          <div>
            <div className="ai-assist-title-row">
              <MdCollections className="ai-assist-title-icon" aria-hidden="true" />
              <h2 className="ai-assist-title">Community brandified</h2>
            </div>
            <p className="ai-assist-subtitle">
              {variations.total} version{variations.total !== 1 ? 's' : ''} for &ldquo;{templateName}&rdquo;
            </p>
          </div>
          <button type="button" className="ai-assist-close" onClick={onClose} aria-label="Close">
            <MdClose size={20} />
          </button>
        </div>

        <div className="variations-grid">
          {variations.items.map((item) => (
            <div key={item.sessionId} className="variations-card">
              <div className="variations-thumb-wrap">
                <img src={item.generatedImageUrl} alt="Brandified variation" loading="lazy" />
              </div>
              <div className="variations-card-meta">
                {item.userRating && <span className="variations-rating">{item.userRating}</span>}
                {item.timestamp && <span className="variations-date">{formatDate(item.timestamp)}</span>}
              </div>
              <button
                type="button"
                className="story-btn primary variations-use-btn"
                onClick={() => onUseVariation(item.generatedImageUrl)}
              >
                Use this version
              </button>
            </div>
          ))}
        </div>

        <div className="variations-footer">
          <button type="button" className="story-btn secondary" onClick={onCreateOwn}>
            + Create your own
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariationsModal;
