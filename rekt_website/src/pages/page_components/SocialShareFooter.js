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

const SocialShareFooter = ({ onSocialShare, className = "" }) => {
  return (
    <div className={`meme-social-footer ${className}`}>
      <div className="social-share-buttons">
        {SOCIAL_PLATFORMS.map((platform) => (
          <button 
            key={platform.id}
            className={`social-share-btn`}
            onClick={() => onSocialShare(platform.id)}
            title={platform.title}
          >
            <platform.icon size={24} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SocialShareFooter; 