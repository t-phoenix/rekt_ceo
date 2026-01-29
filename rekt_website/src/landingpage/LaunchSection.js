import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './styles/launchSection.css';
import launchVideo from '../creatives/ai_image/Launch_Scrub.mp4';

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default function LaunchSection() {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const initializedRef = useRef(false);

    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;

        if (!video || !container) return;

        let targetTime = 0;
        let currentTime = 0;
        let rafId = null;

        // Force video to stay paused and ready
        video.pause();
        video.muted = true;
        video.playsInline = true;

        const syncVideo = () => {
            // Smoothly interpolate towards the target time
            // 0.1 is the 'fluidity' factor - smaller = smoother but more 'rubbery'
            currentTime += (targetTime - currentTime) * 0.15;

            // Only seek if the difference is measurable to save CPU
            if (Math.abs(currentTime - targetTime) > 0.001) {
                video.currentTime = currentTime;
            }

            // Mobile focus: pan video from left to right as it plays
            if (window.innerWidth <= 768 && video.duration) {
                const progress = currentTime / video.duration;
                // Move focus from 0% (left) to 100% (right)
                video.style.objectPosition = `${progress * 100}% center`;
            } else {
                video.style.objectPosition = 'center center';
            }

            rafId = requestAnimationFrame(syncVideo);
        };

        const initScrollTrigger = () => {
            if (!video.duration || initializedRef.current) return;
            initializedRef.current = true;
            setIsReady(true);

            // Starts the rendering loop
            rafId = requestAnimationFrame(syncVideo);

            ScrollTrigger.create({
                trigger: container,
                start: "top top",
                end: "bottom bottom",
                onUpdate: (self) => {
                    // We just update the 'target' and let the RAF handle the smooth seek
                    targetTime = self.progress * video.duration;
                },
                onRefresh: (self) => {
                    targetTime = self.progress * video.duration;
                    currentTime = targetTime;
                    video.currentTime = targetTime;
                }
            });
        };

        const handleMetadata = () => {
            if (video.duration) initScrollTrigger();
        };

        if (video.readyState >= 1) {
            initScrollTrigger();
        } else {
            video.addEventListener('loadedmetadata', handleMetadata);
        }

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            video.removeEventListener('loadedmetadata', handleMetadata);
            ScrollTrigger.getAll().forEach(st => {
                if (st.vars.trigger === container) st.kill();
            });
        };
    }, []);

    return (
        <div id="launch" ref={containerRef} className="launch-section">

            <div className="launch-video-container">
                <div className='launch-title-div'>
                    <p className='launch-title'>Launch Mechanism</p>
                </div>
                <video
                    ref={videoRef}
                    className={`launch-video-main ${isReady ? 'visible' : ''}`}
                    preload="auto"
                    playsInline
                    muted
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                >
                    <source src={launchVideo} type="video/mp4" />
                </video>

                {/* Instant loading experience */}
                {!isReady && (
                    <div className="launch-loading-minimal">
                        <div className="loading-spinner-small"></div>
                    </div>
                )}
            </div>
        </div>
    );
}

