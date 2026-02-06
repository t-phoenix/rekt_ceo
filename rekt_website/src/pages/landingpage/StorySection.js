import { useEffect, useRef, useState } from 'react';
import { useNavigate } from "react-router-dom";
import "./styles/intro.css";
import "./styles/story.css";
import rektceologo from "../../creatives/Rekt_logo_illustration.png";
import Icon from "react-crypto-icons";
import { FiTrendingUp, FiHeart, FiUsers } from "react-icons/fi";

export default function StorySection() {
    const navigate = useNavigate();
    const [visibleElements, setVisibleElements] = useState({});
    const [hoveredPoint, setHoveredPoint] = useState(null);

    const handleButtonClick = (route, event) => {
        // Add click animation class
        const button = event.target;
        button.classList.add('clicked');

        // Remove the class after animation completes
        setTimeout(() => {
            button.classList.remove('clicked');
            navigate(route);
        }, 500);
    };

    // Available crypto brands for bubbles
    const brands = ["btc", "eth", "usdt", "bnb", "sol", "usdc", "ada", "avax", "trx", "doge", "link", "matic", "etc", "dai", "uni", "fil", "stx", "ldo", "zil", "1inch", "aave", "akt", "atom", "bal", "busd", "cake", "comp", "cosm", "dodo", "tfuel", "grt", "hbar", "paxg", "qtum", "ray", "sia", "snx", "storj", "sushi"];

    const [bubbles, setBubbles] = useState([
        { id: 1, coin: 'btc', color: 'var(--color-purple)', position: 'top-right', delay: 0 },
        { id: 2, coin: 'eth', color: 'var(--color-blue-primary)', position: 'bottom-left', delay: 1 },
        { id: 3, coin: 'doge', color: 'var(--color-yellow)', position: 'bottom-right', delay: 2 },
        { id: 4, coin: 'sol', color: 'var(--color-red)', position: 'top-left', delay: 0.5 },
        { id: 5, coin: 'usdc', color: 'var(--color-green)', position: 'top-center', delay: 1.5 }
    ]);
    const sectionRef = useRef(null);

    // Safe icon rendering with fallbacks
    const SafeIcon = ({ IconComponent, fallback = "🚀" }) => {
        try {
            return IconComponent ? <IconComponent /> : <span>{fallback}</span>;
        } catch (error) {
            console.warn('Icon failed to render:', error);
            return <span>{fallback}</span>;
        }
    };

    // Color options for bubbles
    const colorOptions = [
        'var(--color-purple)',
        'var(--color-blue-primary)',
        'var(--color-yellow)',
        'var(--color-red)',
        'var(--color-green)',
    ];

    // Position options for bubbles
    const positionOptions = [
        'top-right',
        'top-left',
        'bottom-right',
        'bottom-left',
        'top-center',
        'bottom-center',
        'left-center',
        'right-center'
    ];

    // Check if position is too close to existing bubbles
    const isPositionOccupied = (newPosition, existingBubbles) => {
        const positionMap = {
            'top-right': { x: 80, y: 20 },
            'top-left': { x: 20, y: 20 },
            'bottom-right': { x: 80, y: 80 },
            'bottom-left': { x: 20, y: 80 },
            'top-center': { x: 50, y: 10 },
            'bottom-center': { x: 50, y: 90 },
            'left-center': { x: 10, y: 50 },
            'right-center': { x: 90, y: 50 }
        };

        const newPos = positionMap[newPosition];
        if (!newPos) return false;

        return existingBubbles.some(bubble => {
            const existingPos = positionMap[bubble.position];
            if (!existingPos) return false;

            const distance = Math.sqrt(
                Math.pow(newPos.x - existingPos.x, 2) +
                Math.pow(newPos.y - existingPos.y, 2)
            );

            return distance < 30; // Minimum distance between bubbles
        });
    };

    // Get random position that's not too close to existing bubbles
    const getRandomPosition = (existingBubbles) => {
        const availablePositions = positionOptions.filter(pos =>
            !isPositionOccupied(pos, existingBubbles)
        );

        if (availablePositions.length === 0) {
            // If no positions available, use any position
            return positionOptions[Math.floor(Math.random() * positionOptions.length)];
        }

        return availablePositions[Math.floor(Math.random() * availablePositions.length)];
    };

    // Get random coin from available brands
    const getRandomCoin = () => {
        return brands[Math.floor(Math.random() * brands.length)];
    };

    // Handle bubble click with burst animation
    const handleBubbleClick = (bubbleId) => {
        // Add burst animation class
        const bubbleElement = document.querySelector(`[data-bubble-id="${bubbleId}"]`);
        if (bubbleElement) {
            bubbleElement.classList.add('bubble-burst');
        }

        // Remove the clicked bubble after animation
        setTimeout(() => {
            setBubbles(prev => prev.filter(bubble => bubble.id !== bubbleId));

            // Add a new random bubble after a short delay
            setTimeout(() => {
                const newBubble = {
                    id: Date.now(),
                    coin: getRandomCoin(),
                    color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
                    position: getRandomPosition(bubbles.filter(b => b.id !== bubbleId)),
                    delay: Math.floor(Math.random() * 3)
                };
                setBubbles(prev => [...prev, newBubble]);
            }, 200);
        }, 300);
    };

    useEffect(() => {
        // Set all elements as visible immediately
        const allElements = [
            'title', 'underline', 'para1', 'para2', 'para3', 'para4',
            'conclusion', 'circle', 'communityText', 'footer',
            'point1', 'point2', 'point3'
        ];
        setVisibleElements(
            allElements.reduce((acc, element) => {
                acc[element] = true;
                return acc;
            }, {})
        );
    }, []);

    return (
        <section id="story" className="story-section-modern" ref={sectionRef}>
            {/* Background cloud elements */}
            <div className="story-cloud large" style={{ top: '10%', animationDelay: '0s' }} />
            <div className="story-cloud medium" style={{ top: '30%', animationDelay: '-2s' }} />
            <div className="story-cloud large" style={{ top: '50%', animationDelay: '-10s' }} />
            <div className="story-cloud small" style={{ top: '70%', animationDelay: '-6s' }} />
            <div className="story-cloud medium" style={{ top: '90%', animationDelay: '-14s' }} />

            <div className="story-container">
                <h1 className="section-title">STORY</h1>
                {/* <div className="story-underline" data-animate="underline" data-delay="200"></div> */}

                <div className="story-content-grid">
                    <div className="story-left-column">
                        <div className="story-narrative">
                            <div className={`story-paragraph ${visibleElements.para1 ? 'animate-in' : ''}`}
                                data-animate="para1" data-delay="400">
                                <h2 className="story-highlight">I was a meme guy once.</h2>
                            </div>

                            <div className={`story-paragraph ${visibleElements.para2 ? 'animate-in' : ''}`}
                                data-animate="para2" data-delay="600">
                                <p>I spent hours scrolling through crypto Twitter and Discord, laughing at jokes that hit too close to home. Like every other degen, I aped into meme coins hyped by influencers, hoping to turn my crumbs into millions.</p>
                            </div>

                            <div className={`story-paragraph ${visibleElements.para3 ? 'animate-in' : ''}`}
                                data-animate="para3" data-delay="800">
                                <p>Guess what? The market turned, and my bags? Worth less than gas fees to sell. <span className="rekt-text">I was rekt.</span></p>
                            </div>

                            <div className={`story-paragraph ${visibleElements.para4 ? 'animate-in' : ''}`}
                                data-animate="para4" data-delay="1000">
                                <p>But I wasn't done. I doubled down, learned the game, and stopped chasing every moonshot. I found project with purpose, a strong community, and real vibes.</p>
                            </div>

                            <div className={`story-paragraph story-conclusion ${visibleElements.conclusion ? 'animate-in' : ''}`}
                                data-animate="conclusion" data-delay="1200">
                                <p><strong>Slowly but surely, my memes turned into dreams. Now, I'm not just holding bags—I'm holding the future.</strong></p>
                            </div>
                        </div>

                        <div className={`story-footer ${visibleElements.footer ? 'animate-in' : ''}`}
                            data-animate="footer" data-delay="1400">
                            <p className="trust-message">Trust your gut, back yourself, and enjoy the ride.</p>

                            <div className="story-buttons">
                                <button className="story-btn primary" onClick={(e) => handleButtonClick("/pfp", e)}>
                                    MAKE YOUR PFP
                                </button>
                                <button className="story-btn secondary" onClick={(e) => handleButtonClick("/memes", e)}>
                                    CREATE MEME
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="story-right-column">
                        <div className="story-visual">
                            <div className={`community-circle ${visibleElements.circle ? 'animate-in' : ''}`}
                                data-animate="circle" data-delay="1000">

                                <div className="circle-content">
                                    {bubbles.map((bubble) => (
                                        <div
                                            key={bubble.id}
                                            data-bubble-id={bubble.id}
                                            className={`floating-icon bubble-${bubble.position}`}
                                            style={{

                                                color: 'black',
                                                animationDelay: `${bubble.delay}s`
                                            }}
                                            onClick={() => handleBubbleClick(bubble.id)}
                                        >
                                            <div className="icon-background">
                                                <Icon
                                                    name={bubble.coin}
                                                    size={30}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="circle-center">
                                        <img
                                            src={rektceologo}
                                            alt="REKT CEO"
                                            className="rekt-logo"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                        <span className="rekt-fallback">β</span>
                                    </div>
                                </div>
                            </div>
                            {/* <div className="click-hint">
                                    <span className="hint-text">Click to pop!</span>
                                    <div className="hint-arrow">→</div>
                            </div> */}


                            <div className={`community-text ${visibleElements.communityText ? 'animate-in' : ''}`}
                                data-animate="communityText" data-delay="1600">
                                <h3>A decentralized community</h3>
                                <p>Where we stick together, innovate, and turn cool ideas into reality. We've all been rekt at some point—don't let it define you.</p>
                            </div>
                        </div>

                        <div className="story-points">
                            <div className={`story-point ${visibleElements.point1 ? 'animate-in' : ''}`}
                                data-animate="point1" data-delay="1800"
                                onMouseEnter={() => setHoveredPoint('money')}
                                onMouseLeave={() => setHoveredPoint(null)}>
                                <div className={`story-icon ${hoveredPoint === 'money' ? 'icon-hover' : ''}`}>
                                    <SafeIcon IconComponent={FiTrendingUp} fallback="📈" />
                                </div>
                                <span>We're all here to make money</span>
                            </div>

                            <div className={`story-point ${visibleElements.point2 ? 'animate-in' : ''}`}
                                data-animate="point2" data-delay="2000"
                                onMouseEnter={() => setHoveredPoint('fun')}
                                onMouseLeave={() => setHoveredPoint(null)}>
                                <div className={`story-icon ${hoveredPoint === 'fun' ? 'icon-hover' : ''}`}>
                                    <SafeIcon IconComponent={FiHeart} fallback="❤️" />
                                </div>
                                <span>We're all here to have fun</span>
                            </div>

                            <div className={`story-point ${visibleElements.point3 ? 'animate-in' : ''}`}
                                data-animate="point3" data-delay="2200"
                                onMouseEnter={() => setHoveredPoint('belong')}
                                onMouseLeave={() => setHoveredPoint(null)}>
                                <div className={`story-icon ${hoveredPoint === 'belong' ? 'icon-hover' : ''}`}>
                                    <SafeIcon IconComponent={FiUsers} fallback="👥" />
                                </div>
                                <span>We're all here to belong</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}