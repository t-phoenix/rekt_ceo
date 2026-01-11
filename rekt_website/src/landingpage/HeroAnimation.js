import React, { useEffect, useRef, useState } from 'react';
import './styles/heroAnimation.css';
import heroVideo from '../creatives/ai_image/Hero_Anim.webm';

export default function HeroAnimation() {
    const videoRef = useRef(null);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    useEffect(() => {
        const video = videoRef.current;

        if (video) {
            // Handle video load
            const handleLoadedData = () => {
                setIsVideoLoaded(true);
            };

            // Handle video error
            const handleError = (e) => {
                console.error('Video failed to load:', e);
            };

            video.addEventListener('loadeddata', handleLoadedData);
            video.addEventListener('error', handleError);

            // Ensure video plays on mount
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Autoplay prevented:', error);
                    // Autoplay was prevented, video will play when user interacts
                });
            }

            return () => {
                video.removeEventListener('loadeddata', handleLoadedData);
                video.removeEventListener('error', handleError);
            };
        }
    }, []);

    return (
        <div className="hero-animation-container">
            <video
                ref={videoRef}
                className={`hero-video ${isVideoLoaded ? 'loaded' : ''}`}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
            >
                <source src={heroVideo} type="video/webm" />
                {/* Fallback message for browsers that don't support video */}
                <div className="video-fallback">
                    Your browser does not support the video tag.
                </div>
            </video>
            {!isVideoLoaded && (
                <div className="video-loading">
                    <div className="loading-spinner"></div>
                </div>
            )}
        </div>
    );
}
