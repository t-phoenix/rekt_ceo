import React, { useState, useEffect, useRef, useCallback } from "react";
import "./styles/roadmap.css";
import neon_penthouse from "../creatives/neon_penthouse.jpg";

// Roadmap milestones data
const milestones = [
  {
    id: 1,
    title: "GET $CEO",
    status: "COMPLETED",
    description: "Join the revolution",
    cta: "Buy Now",
    ctaLink: "#buy",
    progress: 100
  },
  {
    id: 2,
    title: "MINT PFP",
    status: "ACTIVE",
    description: "Create your identity",
    cta: "Mint NFT",
    ctaLink: "#pfp",
    progress: 75
  },
  {
    id: 3,
    title: "GENERATE MEME",
    status: "ACTIVE",
    description: "Spread the culture",
    cta: "Create Meme",
    ctaLink: "#meme",
    progress: 60
  },
  {
    id: 4,
    title: "FUND CLUBHOUSE",
    status: "IN PROGRESS",
    description: "Build the community",
    cta: "Contribute",
    ctaLink: "#fund",
    progress: 45
  },
  {
    id: 5,
    title: "EARN ON RAYDIUM",
    status: "UPCOMING",
    description: "Become LP provider",
    cta: "Learn More",
    ctaLink: "#raydium",
    progress: 20
  },
  {
    id: 6,
    title: "INVESTMENT BOX",
    status: "UPCOMING",
    description: "Fund the future",
    cta: "Coming Soon",
    ctaLink: "#invest",
    progress: 10
  },
  {
    id: 7,
    title: "DAO GOVERNANCE",
    status: "PLANNED",
    description: "Shape the ecosystem",
    cta: "Join Waitlist",
    ctaLink: "#dao",
    progress: 5
  },
  {
    id: 8,
    title: "SHARE ON X",
    status: "ONGOING",
    description: "Spread the word",
    cta: "Share Now",
    ctaLink: "https://twitter.com",
    progress: 50
  }
];

export default function Roadmap() {
  const [currentMilestone, setCurrentMilestone] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('down');
  
  const sectionRef = useRef(null);
  const progressRef = useRef(0);
  const velocityRef = useRef(0);
  const lastScrollY = useRef(0);
  const animationFrameId = useRef(null);
  const sectionTopRef = useRef(0);
  const sectionBottomRef = useRef(0);

  // Calculate velocity-based scroll speed multiplier
  const calculateSpeedMultiplier = (velocity) => {
    const absVelocity = Math.abs(velocity);
    if (absVelocity < 5) return 1;
    if (absVelocity < 10) return 1.5;
    if (absVelocity < 20) return 2;
    return 2.5;
  };

  // Intersection Observer for viewport detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isInView = entry.isIntersecting;
          const rect = entry.boundingClientRect;
          
          setIsVisible(isInView);
          
          // Check if section is mostly in viewport
          const viewportCoverage = entry.intersectionRatio;
          setIsInViewport(viewportCoverage > 0.3);
          
          // Store section boundaries
          if (sectionRef.current) {
            const sectionRect = sectionRef.current.getBoundingClientRect();
            sectionTopRef.current = window.scrollY + sectionRect.top;
            sectionBottomRef.current = window.scrollY + sectionRect.bottom;
          }
          
          // Reset progress when section exits viewport going up
          if (!isInView && rect.top > window.innerHeight) {
            progressRef.current = 0;
            setScrollProgress(0);
            setCurrentMilestone(0);
            velocityRef.current = 0;
          }
        });
      },
      {
        threshold: [0, 0.1, 0.25, 0.3, 0.5, 0.75, 0.9, 1.0],
        rootMargin: '0px'
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  // Main scroll handler for milestone progression
  const handleScroll = useCallback(() => {
    if (!sectionRef.current || !isInViewport) return;

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    animationFrameId.current = requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;
      
      // Detect scroll direction
      if (scrollDelta > 0) {
        setScrollDirection('down');
      } else if (scrollDelta < 0) {
        setScrollDirection('up');
      }
      
      // Calculate velocity
      const velocity = Math.abs(scrollDelta);
      velocityRef.current = velocity;
      
      // Calculate progress based on scroll position within section
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const sectionHeight = rect.height;
      
      // How far through the section have we scrolled?
      const scrollThroughSection = Math.max(0, -rect.top+140);
      const maxScrollThrough = Math.max(sectionHeight - windowHeight, sectionHeight * 0.18);
      
      if (maxScrollThrough > 0) {
        // Calculate progress as percentage through the section
        const rawProgress = (scrollThroughSection / maxScrollThrough) * 100;
        progressRef.current = Math.max(0, Math.min(100, rawProgress));
      } else {
        // Section fits in viewport, use intersection-based progress
        const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
        const visibilityRatio = visibleHeight / sectionHeight;
        
        if (rect.top <= 0 && rect.bottom >= windowHeight) {
          // Fully in view
          const scrollInView = -rect.top / (sectionHeight * 0.1);
          progressRef.current = Math.min(100, scrollInView * 100);
        } else if (rect.top > 0) {
          // Entering from top
          progressRef.current = Math.max(0, (1 - rect.top / windowHeight) * 30);
        } else if (rect.bottom < windowHeight) {
          // Exiting from bottom
          progressRef.current = Math.min(100, 70 + (rect.bottom / windowHeight) * 30);
        }
      }
      
      setScrollProgress(progressRef.current);
      
      // Update milestone based on scroll progress
      const milestoneIndex = Math.min(
        milestones.length - 1,
        Math.floor((progressRef.current / 100) * milestones.length)
      );
      setCurrentMilestone(milestoneIndex);
      
      lastScrollY.current = currentScrollY;
    });
  }, [isInViewport]);

  // Wheel event handler for enhanced scroll detection
  const handleWheel = useCallback((e) => {
    if (!sectionRef.current || !isVisible) return;
    
    const velocity = Math.abs(e.deltaY);
    const speedMultiplier = calculateSpeedMultiplier(velocity);
    
    if (isInViewport && animationFrameId.current) {
      velocityRef.current = velocity * speedMultiplier;
    }
  }, [isVisible, isInViewport]);

  // Touch handlers for mobile scroll detection
  const touchStartY = useRef(0);
  const touchVelocity = useRef(0);
  const lastTouchTime = useRef(Date.now());
  
  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    lastTouchTime.current = Date.now();
    touchVelocity.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!sectionRef.current || !isVisible || !isInViewport) return;

    const currentTouch = e.touches[0].clientY;
    const touchDelta = touchStartY.current - currentTouch;
    const currentTime = Date.now();
    const timeDelta = Math.max(currentTime - lastTouchTime.current, 16);
    
    touchVelocity.current = touchDelta / timeDelta;
    velocityRef.current = Math.abs(touchVelocity.current) * calculateSpeedMultiplier(Math.abs(touchVelocity.current));
    
    touchStartY.current = currentTouch;
    lastTouchTime.current = currentTime;
  }, [isVisible, isInViewport]);

  // Scroll direction detection
  useEffect(() => {
    let ticking = false;
    
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDirection('up');
      }
      lastScrollY.current = currentScrollY;
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestTick, { passive: true });
    return () => window.removeEventListener('scroll', requestTick);
  }, []);

  // Event listeners
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [handleScroll, handleWheel, handleTouchStart, handleTouchMove]);

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED": return "#00ff00";
      case "ACTIVE": return "#00ffff";
      case "IN PROGRESS": return "#ffff00";
      case "UPCOMING": return "#ff00ff";
      case "PLANNED": return "#ff6600";
      case "ONGOING": return "#00ffff";
      default: return "#ffffff";
    }
  };

  const getStatusColorRGB = (status) => {
    const color = getStatusColor(status);
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `${r}, ${g}, ${b}`;
  };

  const handleCTAClick = (link) => {
    if (link.startsWith("http")) {
      window.open(link, "_blank");
    } else {
      document.querySelector(link)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section 
      id="roadmap" 
      className={`roadmap-section ${isInViewport ? 'in-viewport' : ''}`}
      ref={sectionRef}
      style={{ backgroundImage: `url(${neon_penthouse})` }}
      data-scroll-direction={scrollDirection}
    >
      <div className="roadmap-container">
        <h1 className="section-title" style={{color: 'var(--color-yellow)', fontSize: '4rem'}}>ROADMAP</h1>
        
        {/* Scroll Progress Indicator */}
        {isInViewport && (
          <div className="scroll-progress-bar">
            <div 
              className="scroll-progress-fill" 
              style={{ 
                height: `${scrollProgress}%`,
                transition: velocityRef.current > 5 ? 'none' : 'height 0.3s ease-out'
              }}
            />
            <div className="velocity-indicator" style={{
              opacity: Math.min(1, velocityRef.current / 10),
              transform: `translate(-50%, -50%) scale(${1 + velocityRef.current / 20})`
            }} />
          </div>
        )}
        
        {/* Monitor Overlays */}
        <div className={`monitors-container ${isVisible ? 'active' : ''}`}>
          
          {/* Left Monitor - Status Display */}
          <div className="monitor monitor-left">
            <div className="monitor-screen">
              <div className="monitor-content">
                <div className="status-display">
                  <h3 className="status-title">STATUS</h3>
                  <div 
                    className="status-indicator"
                    style={{ 
                      color: getStatusColor(milestones[currentMilestone].status),
                      textShadow: `0 0 20px ${getStatusColor(milestones[currentMilestone].status)}`
                    }}
                  >
                    {milestones[currentMilestone].status}
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${milestones[currentMilestone].progress}%`,
                        background: `linear-gradient(90deg, ${getStatusColor(milestones[currentMilestone].status)}, #00ffff)`
                      }}
                    />
                  </div>
                  <div className="progress-text">
                    {milestones[currentMilestone].progress}% COMPLETE
                  </div>
                </div>
                
                {/* Mini roadmap navigator */}
                <div className="milestone-dots">
                  {milestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className={`dot ${index === currentMilestone ? 'active' : ''} ${index < currentMilestone ? 'completed' : ''}`}
                      style={{
                        background: index <= currentMilestone ? getStatusColor(milestone.status) : 'rgba(255,255,255,0.2)',
                        transform: index === currentMilestone ? 
                          `scale(${1.5 + velocityRef.current / 30})` : 'scale(1)'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="monitor-glow" />
          </div>

          {/* Center Monitor - Main Content */}
          <div className="monitor monitor-center">
            <div className="monitor-screen">
              <div className="monitor-content">
                <div className="milestone-main">
                  <div className="milestone-number">
                    PHASE {milestones[currentMilestone].id}
                  </div>
                  <h2 className="milestone-title">
                    {milestones[currentMilestone].title}
                  </h2>
                  <p className="milestone-description">
                    {milestones[currentMilestone].description}
                  </p>
                  
                  {/* Status Display for Mobile/Tablet */}
                  <div className="status-display mobile-status">
                    <h3 className="status-title">STATUS</h3>
                    <div 
                      className="status-indicator"
                      style={{ 
                        color: getStatusColor(milestones[currentMilestone].status),
                        textShadow: `0 0 20px ${getStatusColor(milestones[currentMilestone].status)}`
                      }}
                    >
                      {milestones[currentMilestone].status}
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${milestones[currentMilestone].progress}%`,
                          background: `linear-gradient(90deg, ${getStatusColor(milestones[currentMilestone].status)}, #00ffff)`
                        }}
                      />
                    </div>
                    <div className="progress-text">
                      {milestones[currentMilestone].progress}% COMPLETE
                    </div>
                  </div>

                  <button 
                    className={`cta-button ${milestones[currentMilestone].id % 2 === 0 ? 'cta-button-yellow' : 'cta-button-red'}`}
                    onClick={() => handleCTAClick(milestones[currentMilestone].ctaLink)}
                  >
                    <span className="cta-text">{milestones[currentMilestone].cta}</span>
                  </button>
                </div>
                
                {/* Animated background grid */}
                <div className="grid-background">
                  <div className="grid-lines" style={{
                    animationDuration: `${Math.max(5, 20 - velocityRef.current)}s`
                  }} />
                </div>
              </div>
            </div>
            <div className="monitor-glow" />
          </div>

          {/* Right Monitor - Timeline */}
          <div className="monitor monitor-right">
            <div className="monitor-screen">
              <div className="monitor-content">
                <div className="timeline-display">
                  <h3 className="timeline-title">TIMELINE</h3>
                  <div className="timeline-list">
                    {milestones.map((milestone, index) => (
                      <div 
                        key={milestone.id}
                        className={`timeline-item ${index === currentMilestone ? 'active' : ''} ${index < currentMilestone ? 'completed' : ''}`}
                        style={{
                          '--status-color': getStatusColor(milestone.status),
                          '--status-color-rgb': getStatusColorRGB(milestone.status)
                        }}
                      >
                        <div 
                          className="timeline-marker" 
                          style={{
                            background: index <= currentMilestone ? getStatusColor(milestone.status) : 'rgba(255,255,255,0.2)',
                            boxShadow: index <= currentMilestone ? `0 0 10px ${getStatusColor(milestone.status)}` : 'none',
                            transform: index === currentMilestone ? 'scale(1.2)' : 'scale(1)'
                          }}
                        />
                        <div className="timeline-content">
                          <span className="timeline-phase">P{milestone.id}</span>
                          <span className="timeline-name">{milestone.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="monitor-glow" />
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="scroll-indicator">
          <div className="scroll-text">
            {isInViewport ? 
              `TIMELINE ${Math.round(scrollProgress)}%` : 
             'SCROLL TO EXPLORE'}
          </div>
          <div className="scroll-arrow">
            {scrollDirection === 'down' ? '↓' : '↑'}
          </div>
        </div>
      </div>
    </section>
  );
}