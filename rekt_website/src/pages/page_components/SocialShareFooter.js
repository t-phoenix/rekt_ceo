import React from 'react';
import { FaInstagram, FaReddit, FaDownload } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { SiFarcaster } from "react-icons/si";

// Social share platforms configuration
const SOCIAL_PLATFORMS = [
  {
    id: 'download',
    name: 'Download',
    icon: FaDownload,
    title: 'Download the image'
  },
  {
    id: 'farcaster',
    name: 'Farcaster',
    icon: SiFarcaster,
    title: 'Share on Farcaster'
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: FaReddit,
    title: 'Share on Reddit'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: FaInstagram,
    title: 'Share on Instagram'
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: FaXTwitter,
    title: 'Share on X (Twitter)'
  }
];

const SocialShareFooter = ({ onSocialShare, className = "", children }) => {
  const handleClick = (platformId, event) => {
    // Prevent rapid successive clicks
    const button = event.target.closest('button');
    if (button) {
      button.disabled = true;
      setTimeout(() => {
        button.disabled = false;
      }, 1000); // 1 second cooldown
    }
    onSocialShare(platformId);
  };

  return (
    <div className={`meme-social-footer ${className}`}>
      <div className="social-footer-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBlock: '1rem' }}>
        <div className="social-footer-left" style={{ display: 'flex', gap: '0px' }}>
          {children}
        </div>
        <div className="social-share-buttons" style={{ marginBlock: 0, width: 'auto' }}>
          {SOCIAL_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              className={`social-share-btn ${platform.id}`}
              onClick={(event) => handleClick(platform.id, event)}
              title={platform.title}
            >
              <platform.icon size={24} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialShareFooter; 