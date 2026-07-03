import React, { useState, useEffect } from 'react';
import { Crown, Gift, Sparkles } from 'lucide-react';

const PERKS = [
    {
        text: "Gain exclusive community membership and flex your roles",
        icon: Crown,
        color: "#FFD700" // Yellow
    },
    {
        text: "Unlock early access to future rewards, products, IRL experiences, merch, and more",
        icon: Gift,
        color: "#00E5FF" // Neon Cyan
    },
    {
        text: "Participate in governance and make your voice heard on key decisions",
        icon: Sparkles,
        color: "#FF3366" // Neon Pink
    }
];

const PerksCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        let interval;
        if (!isHovered) {
            interval = setInterval(() => {
                setCurrentIndex((prevIndex) => (prevIndex + 1) % PERKS.length);
            }, 3500);
        }

        return () => clearInterval(interval);
    }, [isHovered]);

    return (
        <div
            className="pfp-mint-card"
            style={{
                marginBottom: "0.5rem",
                position: "relative",
                minHeight: "135px",
                transition: "all 0.3s ease",
                boxShadow: isHovered ? "0 8px 32px rgba(255, 215, 0, 0.15)" : "0 8px 32px rgba(0, 0, 0, 0.3)"
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="pfp-mint-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="pfp-mint-title">Perks</h3>
                {/* Dots indicator */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    {PERKS.map((_, idx) => (
                        <div
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: idx === currentIndex ? PERKS[idx].color : 'rgba(255, 255, 255, 0.2)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                transform: idx === currentIndex ? 'scale(1.2)' : 'scale(1)'
                            }}
                        />
                    ))}
                </div>
            </div>
            <div className="pfp-mint-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "85px", overflow: "hidden", position: "relative" }}>
                {PERKS.map((perk, index) => {
                    const Icon = perk.icon;
                    let opacity = 0;
                    let transform = "translateX(50%) scale(0.95)";

                    if (index === currentIndex) {
                        opacity = 1;
                        transform = "translateX(0) scale(1)";
                    } else if (index === (currentIndex - 1 + PERKS.length) % PERKS.length) {
                        opacity = 0;
                        transform = "translateX(-50%) scale(0.95)";
                    }

                    return (
                        <div
                            key={index}
                            style={{
                                position: "absolute",
                                width: "100%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: 0,
                                opacity: opacity,
                                transform: transform,
                                transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                padding: "0 15px",
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    backgroundColor: `${perk.color}15`,
                                    border: `1px solid ${perk.color}40`,
                                    flexShrink: 0,
                                    boxShadow: `0 4px 12px ${perk.color}15`
                                }}>
                                    <Icon size={26} color={perk.color} style={{ filter: `drop-shadow(0 0 8px ${perk.color}80)` }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left' }}>
                                    <p style={{
                                        margin: 0,
                                        fontSize: "0.95rem",
                                        fontWeight: "700",
                                        color: "rgba(255, 255, 255, 0.95)",
                                        fontFamily: "var(--body-font, inherit)",
                                        lineHeight: "1.4",
                                        textShadow: "0 2px 4px rgba(0,0,0,0.5)"
                                    }}>
                                        {perk.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PerksCarousel;
