import React from 'react';

const ResponsiveMessage = ({ screenWidth }) => {
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
};

export default ResponsiveMessage;
