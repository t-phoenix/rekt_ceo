import { useEffect, useRef } from 'react';
import { MdClose, MdCollections, MdHistory, MdAutoAwesome } from 'react-icons/md';

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};

const GenerationThumb = ({ item, isActive, onSelect, badge }) => (
  <button
    type="button"
    className={`generations-thumb ${isActive ? 'is-active' : ''} ${item.appliedToCanvas ? 'is-applied' : ''}`}
    onClick={() => onSelect(item)}
    title={item.templateName || 'Generation'}
  >
    <img src={item.generatedImageUrl || item.imageUrl} alt="" loading="lazy" />
    {badge && <span className="generations-thumb-badge">{badge}</span>}
    {isActive && <span className="generations-thumb-active-dot" aria-hidden="true" />}
    {item.appliedToCanvas && !isActive && (
      <span className="generations-thumb-applied-label">Applied</span>
    )}
  </button>
);

const GenerationsPanel = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  templateName,
  templateGenerations,
  sessionGenerations,
  communityVariations,
  variationsLoading,
  activeImageSrc,
  onSelectGeneration,
  onCreateOwn,
  anchorRef,
}) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose();
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const isActiveUrl = (url) => Boolean(url && activeImageSrc && url === activeImageSrc);

  const templateItems = [
    ...templateGenerations.map((g) => ({ ...g, kind: 'yours' })),
    ...(communityVariations?.items || []).map((v) => ({
      id: `community-${v.sessionId}`,
      generatedImageUrl: v.generatedImageUrl,
      templateName: templateName || 'Community',
      createdAt: v.timestamp,
      userRating: v.userRating,
      kind: 'community',
      appliedToCanvas: isActiveUrl(v.generatedImageUrl),
    })),
  ];

  const sessionCount = sessionGenerations.length;
  const templateCount = templateItems.length;

  const renderEmpty = (message) => (
    <div className="generations-empty">
      <p>{message}</p>
      {onCreateOwn && (
        <button type="button" className="generations-create-btn" onClick={onCreateOwn}>
          <MdAutoAwesome size={16} aria-hidden="true" />
          Create with AI Assist
        </button>
      )}
    </div>
  );

  return (
    <div className="generations-panel" ref={panelRef} role="dialog" aria-label="Generations">
      <div className="generations-panel-header">
        <div className="generations-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'template'}
            className={`generations-tab ${activeTab === 'template' ? 'active' : ''}`}
            onClick={() => onTabChange('template')}
          >
            <MdCollections size={15} aria-hidden="true" />
            This meme
            {templateCount > 0 && <span className="generations-tab-count">{templateCount}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'session'}
            className={`generations-tab ${activeTab === 'session' ? 'active' : ''}`}
            onClick={() => onTabChange('session')}
          >
            <MdHistory size={15} aria-hidden="true" />
            Session
            {sessionCount > 0 && <span className="generations-tab-count">{sessionCount}</span>}
          </button>
        </div>
        <button type="button" className="generations-panel-close" onClick={onClose} aria-label="Close">
          <MdClose size={18} />
        </button>
      </div>

      <div className="generations-panel-body">
        {activeTab === 'template' && (
          <>
            {variationsLoading && templateCount === 0 ? (
              <div className="generations-loading">Loading…</div>
            ) : templateCount === 0 ? (
              renderEmpty(
                templateName
                  ? `No brandified versions for "${templateName}" yet.`
                  : 'No generations for this meme yet.'
              )
            ) : (
              <>
                {templateGenerations.length > 0 && (
                  <p className="generations-section-label">Your generations</p>
                )}
                <div className="generations-grid">
                  {templateGenerations.map((item) => (
                    <GenerationThumb
                      key={item.id}
                      item={item}
                      isActive={isActiveUrl(item.generatedImageUrl)}
                      onSelect={onSelectGeneration}
                    />
                  ))}
                </div>
                {(communityVariations?.items?.length || 0) > 0 && (
                  <>
                    <p className="generations-section-label">Community</p>
                    <div className="generations-grid">
                      {(communityVariations.items || []).map((item) => (
                        <GenerationThumb
                          key={`community-${item.sessionId}`}
                          item={{
                            ...item,
                            generatedImageUrl: item.generatedImageUrl,
                            templateName,
                          }}
                          isActive={isActiveUrl(item.generatedImageUrl)}
                          onSelect={(v) =>
                            onSelectGeneration({
                              id: `community-${item.sessionId}`,
                              generatedImageUrl: v.generatedImageUrl,
                              kind: 'community',
                            })
                          }
                          badge={item.userRating || null}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'session' && (
          sessionCount === 0
            ? renderEmpty('No brandify generations in this session yet.')
            : (
              <div className="generations-list">
                {sessionGenerations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`generations-list-item ${isActiveUrl(item.generatedImageUrl) ? 'is-active' : ''}`}
                    onClick={() => onSelectGeneration(item)}
                  >
                    <div className="generations-list-thumb">
                      <img src={item.generatedImageUrl} alt="" loading="lazy" />
                    </div>
                    <div className="generations-list-meta">
                      <span className="generations-list-name">{item.templateName}</span>
                      <span className="generations-list-time">{formatTime(item.createdAt)}</span>
                    </div>
                    {item.appliedToCanvas && (
                      <span className="generations-list-badge">Applied</span>
                    )}
                    {isActiveUrl(item.generatedImageUrl) && (
                      <span className="generations-list-badge generations-list-badge--active">On canvas</span>
                    )}
                  </button>
                ))}
              </div>
            )
        )}
      </div>

      {onCreateOwn && (activeTab === 'template' ? templateCount > 0 : sessionCount > 0) && (
        <div className="generations-panel-footer">
          <button type="button" className="generations-create-btn" onClick={onCreateOwn}>
            <MdAutoAwesome size={16} aria-hidden="true" />
            Create new version
          </button>
        </div>
      )}
    </div>
  );
};

export default GenerationsPanel;
