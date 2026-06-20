import './AiGenerateModal.css';

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const AiSuggestionHistory = ({
  sessionsGrouped,
  currentSessionId,
  onReuseOption,
  onRemoveGeneration,
  onClearSession,
  onClearAll,
}) => {
  const totalCount = sessionsGrouped.reduce((n, s) => n + s.generations.length, 0);

  if (!sessionsGrouped.length) {
    return (
      <div className="ai-history-empty">
        <p>No saved suggestions yet.</p>
        <p className="ai-modal-hint">Generations from this browser are saved here, grouped by template and topic.</p>
      </div>
    );
  }

  return (
    <div className="ai-history">
      <div className="ai-history-toolbar">
        <span className="ai-modal-hint">
          {totalCount} saved batch{totalCount === 1 ? '' : 'es'}
        </span>
        <div className="ai-history-toolbar-actions">
          <button type="button" className="ai-error-action" onClick={onClearSession}>
            Clear session
          </button>
          <button type="button" className="ai-error-action" onClick={onClearAll}>
            Clear all
          </button>
        </div>
      </div>

      {sessionsGrouped.map((session) => (
        <section key={session.sessionId} className="ai-history-session">
          <header className="ai-history-session-header">
            <span className="ai-history-session-title">
              {session.sessionId === currentSessionId ? 'This session' : 'Previous session'}
            </span>
            <span className="ai-history-session-time">{formatWhen(session.lastActiveAt)}</span>
          </header>

          <div className="ai-history-list">
            {session.generations.map((gen) => (
              <article key={gen.id} className="ai-history-item">
                <div className="ai-history-item-thumb-col">
                  {gen.templateThumbnail ? (
                    <img
                      src={gen.templateThumbnail}
                      alt={gen.templateName}
                      className="ai-history-thumb"
                    />
                  ) : (
                    <div className="ai-history-thumb ai-history-thumb--placeholder">🖼</div>
                  )}
                </div>

                <div className="ai-history-item-body">
                  <div className="ai-history-item-meta">
                    <strong className="ai-history-template">{gen.templateName}</strong>
                    <span className="ai-history-time">{formatWhen(gen.createdAt)}</span>
                  </div>

                  <p className="ai-history-topic" title={gen.topic}>
                    <span className="ai-history-topic-icon">
                      {gen.inputMode === 'content' ? '📝' : '💡'}
                    </span>
                    {gen.topic}
                  </p>

                  {gen.metadata?.llm?.model && (
                    <p className="ai-history-llm">{gen.metadata.llm.model}</p>
                  )}

                  <div className="ai-history-options">
                    {gen.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="ai-history-option-btn"
                        onClick={() => onReuseOption(opt, gen)}
                        title={`Apply template + caption #${idx + 1}`}
                      >
                        <span className="ai-history-option-rank">#{idx + 1}</span>
                        <span className="ai-history-option-lines">
                          <span className="ai-history-option-top">{opt.top_text}</span>
                          <span className="ai-history-option-bottom">{opt.bottom_text}</span>
                        </span>
                        <span className="ai-history-option-apply">Apply →</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="ai-history-delete"
                  onClick={() => onRemoveGeneration(gen.id)}
                  title="Remove from history"
                  aria-label="Remove from history"
                >
                  ✕
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default AiSuggestionHistory;
