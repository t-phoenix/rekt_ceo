import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdChevronRight } from 'react-icons/md';
import './styles/launchStrip.css';

export default function LaunchStrip() {
    const navigate = useNavigate();

    const handleNavigate = () => {
        navigate('/blueprint#launch-mechanism');
    };

    return (
        <section className="launch-strip-pro" onClick={handleNavigate}>
            <div className="launch-strip-bg"></div>
            <div className="launch-strip-glow"></div>
            
            <div className="launch-strip-content-pro">
                <div className="strip-badge">NEW</div>
                <h2 className="strip-text-pro">
                    UNDERSTAND THE LAUNCH MECHANISM
                </h2>
                <div className="strip-icon-wrapper">
                    <MdChevronRight size={32} />
                </div>
            </div>
            
            {/* Sleek bottom border instead of tape */}
            <div className="strip-border-bottom"></div>
        </section>
    );
}
