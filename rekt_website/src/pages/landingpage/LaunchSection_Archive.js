import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './styles/launchSection.css';
import launchVideo from '../../creatives/ai_image/Launch_Scrub.mp4';
import launchVideoMobile from '../../creatives/ai_image/Launch_Scrub_mobile.mp4';

gsap.registerPlugin(ScrollTrigger);

const getIsIOS = () => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export default function LaunchSection() {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [needsTap, setNeedsTap] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const initializedRef = useRef(false);
    const scrollTriggerRef = useRef(null);
    const rafIdRef = useRef(null);
    const isRafRunningRef = useRef(false);
    const autoActivatedRef = useRef(false);
    const hasPrimedRef = useRef(false);
    const isPrimingRef = useRef(false);

    const videoSrc = isMobile ? launchVideoMobile : launchVideo;

    // Handle tap to activate video on iOS (fallback if auto-activate fails)
    const handleTapToActivate = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;

        try {
            await video.play();
            video.pause();
            video.currentTime = 0.001;
            autoActivatedRef.current = true;
            setNeedsTap(false);
        } catch (e) {
            // Silent fail - tap didn't work
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const handleChange = (event) => setIsMobile(event.matches);

        setIsMobile(mediaQuery.matches);
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            mediaQuery.addListener(handleChange);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleChange);
            } else {
                mediaQuery.removeListener(handleChange);
            }
        };
    }, []);

    useEffect(() => {
        setIsIOS(getIsIOS());
    }, []);

    const tryAutoActivate = useCallback(async () => {
        const video = videoRef.current;
        if (!video || autoActivatedRef.current) return;

        try {
            await video.play();
            video.pause();
            video.currentTime = 0.001;
            autoActivatedRef.current = true;
            setNeedsTap(false);
        } catch (e) {
            if (isIOS) setNeedsTap(true);
        }
    }, [isIOS]);

    useEffect(() => {
        if (!isIOS) return;

        // One-time user gesture to unlock iOS video decoding.
        const handleUnlockGesture = async () => {
            if (autoActivatedRef.current) return;
            await tryAutoActivate();
        };

        document.addEventListener('pointerdown', handleUnlockGesture, { once: true, passive: true });

        return () => {
            document.removeEventListener('pointerdown', handleUnlockGesture);
        };
    }, [isIOS, tryAutoActivate]);

    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;

        if (!video || !container) return;

        initializedRef.current = false;
        autoActivatedRef.current = false;
        hasPrimedRef.current = false;
        isPrimingRef.current = false;
        setIsReady(false);
        setNeedsTap(false);

        let targetTime = 0;
        let currentTime = 0;

        video.muted = true;
        video.playsInline = true;

        const startRaf = () => {
            if (isRafRunningRef.current) return;
            isRafRunningRef.current = true;
            rafIdRef.current = requestAnimationFrame(syncVideo);
        };

        const stopRaf = () => {
            if (!isRafRunningRef.current) return;
            isRafRunningRef.current = false;
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        };

        const syncVideo = () => {
            currentTime += (targetTime - currentTime) * 0.15;

            // Only seek if we have decoded frames (readyState >= 2)
            if (Math.abs(currentTime - targetTime) > 0.001 && video.readyState >= 2) {
                video.currentTime = currentTime;
            }

            if (isMobile && video.duration) {
                const progress = currentTime / video.duration;
                video.style.objectPosition = `${progress * 100}% center`;
            } else {
                video.style.objectPosition = 'center center';
            }

            if (isRafRunningRef.current) {
                rafIdRef.current = requestAnimationFrame(syncVideo);
            }
        };

        // iOS can show a previously decoded frame; force a seek to the first frame before reveal.
        const primeFirstFrame = (onReady) => {
            if (!isIOS || hasPrimedRef.current || isPrimingRef.current) return false;
            isPrimingRef.current = true;

            const handleSeeked = () => {
                video.removeEventListener('seeked', handleSeeked);
                isPrimingRef.current = false;
                hasPrimedRef.current = true;
                onReady();
            };

            video.addEventListener('seeked', handleSeeked);
            video.currentTime = 0.001;
            return true;
        };

        const initScrollTrigger = () => {
            if (!video.duration || initializedRef.current) return;

            // On iOS, only init if we have actual frame data
            if (isIOS && video.readyState < 2) return;

            if (primeFirstFrame(initScrollTrigger)) return;

            initializedRef.current = true;
            setIsReady(true);
            setNeedsTap(false);

            scrollTriggerRef.current = ScrollTrigger.create({
                trigger: container,
                start: "top top",
                end: "bottom bottom",
                onToggle: (self) => {
                    if (self.isActive) {
                        startRaf();
                    } else {
                        stopRaf();
                    }
                },
                onUpdate: (self) => {
                    targetTime = self.progress * video.duration;
                },
                onRefresh: (self) => {
                    targetTime = self.progress * video.duration;
                    currentTime = targetTime;
                    if (video.readyState >= 2) {
                        video.currentTime = targetTime;
                    }
                }
            });
        };

        const handleCanPlay = () => initScrollTrigger();
        const handleLoadedData = () => initScrollTrigger();

        const handlePlaying = () => {
            video.pause();
            initScrollTrigger();
        };

        const handleMetadata = () => {
            if (!isIOS) {
                initScrollTrigger();
                return;
            }
            tryAutoActivate();
        };

        video.addEventListener('loadedmetadata', handleMetadata);
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('playing', handlePlaying);

        // Force load only if nothing is buffered yet
        if (video.readyState === 0) {
            video.load();
        }

        return () => {
            stopRaf();
            video.removeEventListener('loadedmetadata', handleMetadata);
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('playing', handlePlaying);
            if (scrollTriggerRef.current) {
                scrollTriggerRef.current.kill();
            }
        };
    }, [isIOS, isMobile, tryAutoActivate, videoSrc]);

    return (
        <div id="launch" ref={containerRef} className="launch-section">
            <div className="launch-video-container">
                <div className='launch-title-div'>
                    <p className='launch-title'>Launch Mechanism</p>
                </div>
                <video
                    ref={videoRef}
                    src={videoSrc}
                    className={`launch-video-main ${isReady ? 'visible' : ''}`}
                    preload="auto"
                    playsInline
                    muted
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />

                {/* Loading or tap prompt */}
                {!isReady && (
                    <div
                        className="launch-loading-minimal"
                        onClick={needsTap ? handleTapToActivate : undefined}
                        style={{ cursor: needsTap ? 'pointer' : 'default' }}
                    >
                        {needsTap ? (
                            <div className="tap-to-play">
                                <span>Tap to load video</span>
                            </div>
                        ) : (
                            <div className="loading-spinner-small"></div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
