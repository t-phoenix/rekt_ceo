import React, { useState, useEffect } from 'react';
import RektLogo from '../creatives/Rekt_logo_illustration.png';
import './PageLoader.css';

const loadingPhrases = [
    "Securing the bag...",
    "Firing the dev...",
    "Checking Solana congestion...",
    "Pumping your bags...",
    "Creating generational wealth...",
    "Hiding from the SEC...",
    "Deploying more memes...",
    "Apeing in 3... 2... 1...",
    "Summoning Murad...",
    "Buying the dip..."
];

export default function PageLoader() {
    const [phrase, setPhrase] = useState(loadingPhrases[0]);

    useEffect(() => {
        let index = 1;
        const interval = setInterval(() => {
            setPhrase(loadingPhrases[index]);
            index = (index + 1) % loadingPhrases.length;
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="page-loader-container">
            <div className="loader-content">
                <div className="logo-spinner">
                    <img src={RektLogo} alt="Loading..." className="loader-logo" />
                </div>
                <div className="loader-bar-container">
                    <div className="loader-bar"></div>
                </div>
                <p className="loader-text">{phrase}</p>
            </div>
        </div>
    );
}
