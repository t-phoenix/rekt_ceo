import React from 'react';

/**
 * ComingSoonButton — A temporary disabled placeholder button.
 *
 * Usage:
 *   1. Comment out the original button JSX in the component.
 *   2. Drop in <ComingSoonButton className="..." style={{ ... }} /> to match the original button's layout.
 *   3. When ready to re-enable, delete this component reference and uncomment the original button.
 *
 * @param {string}  className  - Optional CSS class(es) to match the original button's styling.
 * @param {object}  style      - Optional inline styles (e.g. { width: '100%' }) to match layout.
 * @param {string}  label      - Optional custom label text. Defaults to "Coming Soon".
 */
const ComingSoonButton = ({ className = '', style = {}, label = 'Coming Soon' }) => {
    return (
        <button
            disabled
            title="This feature is temporarily disabled — launching with production token!"
            className={className}
            style={{
                ...style,
                opacity: 0.45,
                cursor: 'not-allowed',
                pointerEvents: 'none',
            }}
        >
            🔒 {label}
        </button>
    );
};

export default ComingSoonButton;
