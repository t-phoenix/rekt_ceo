import { exportNodeToPng } from "../utils/exportImage";

/**
 * SharingService - Handles all social media sharing and download functionality
 * for memes created in the Meme Generator
 */
class SharingService {
  constructor() {
    this.showToast = null; // Will be injected
    this.isDownloading = false; // Prevent multiple simultaneous downloads
  }

  /**
   * Set the toast notification function
   * @param {Function} toastFunction - Function to show toast notifications
   */
  setToastFunction(toastFunction) {
    this.showToast = toastFunction;
  }

  /**
   * Main handler for all sharing platforms
   * @param {string} platform - The platform to share to ('download', 'twitter', 'instagram', 'farcaster', 'reddit')
   * @param {Object} options - Sharing options containing canvas ref/element and text content
   */
  async handleSocialShare(platform, options = {}) {
    try {
      const { 
        canvasRef, 
        elementId, 
        topText = '', 
        bottomText = '', 
        shareText = '',
        fileName = 'rekt-ceo'
      } = options;

      // Determine the element to use for export
      const element = canvasRef?.current || (elementId ? document.getElementById(elementId) : null);

      switch (platform) {
        case 'download':
          await this.downloadImage(element, fileName);
          break;
        case 'twitter':
          await this.shareToTwitter(element, topText, bottomText, shareText);
          break;
        case 'instagram':
          await this.shareToInstagram(element, topText, bottomText, shareText, fileName);
          break;
        case 'farcaster':
          await this.shareToFarcaster(element, topText, bottomText, shareText, fileName);
          break;
        case 'reddit':
          await this.shareToReddit(element, topText, bottomText, shareText);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error sharing:', error);
      this._showToast('Error sharing content. Please try again.');
    }
  }

  /**
   * Download an image as a PNG file
   * @param {Object} element - DOM element to capture
   * @param {string} fileName - Base name for the file
   */
  async downloadImage(element, fileName = 'rekt-ceo') {
    try {
      // Prevent multiple simultaneous downloads
      if (this.isDownloading) {
        this._showToast('Download already in progress. Please wait...');
        return;
      }

      if (!element) {
        this._showToast('Content not ready. Please wait a moment.');
        return;
      }

      this.isDownloading = true;
      this._showToast('Generating your image...');
      
      // Export the element as PNG
      const dataURL = await exportNodeToPng(element);
      
      // Create download link
      const link = document.createElement('a');
      link.download = `${fileName}-${Date.now()}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this._showToast('Image downloaded successfully!');
      return dataURL;
    } catch (error) {
      console.error('Download error:', error);
      this._showToast('Error downloading image. Please try again.');
      throw error;
    } finally {
      // Always reset the downloading flag
      this.isDownloading = false;
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use downloadImage instead
   */
  async downloadMeme(canvasRef) {
    return this.downloadImage(canvasRef?.current, 'rekt-ceo-meme');
  }

  /**
   * Share to Twitter/X
   * @param {Object} element - DOM element to capture
   * @param {string} topText - Top text of the content
   * @param {string} bottomText - Bottom text of the content
   * @param {string} customShareText - Custom share text (optional)
   */
  async shareToTwitter(element, topText = '', bottomText = '', customShareText = '') {
    try {
      // Create share text
      const shareText = customShareText || this._createShareText(topText, bottomText);
      const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      
      // If element is provided, try to copy to clipboard
      if (element) {
        const clipboardSuccess = await this.copyImageToClipboard(element);
        
        if (clipboardSuccess) {
          // Open Twitter after successful copy
          window.open(twitterUrl, '_blank');
          
          const isMac = navigator.userAgent.includes('Mac');
          const pasteShortcut = isMac ? 'Cmd+V' : 'Ctrl+V';
          this._showToast(`✅ Image copied! Paste with ${pasteShortcut} in Twitter`);
        } else {
          // Fallback: Download and open Twitter
          await this.downloadImage(element, 'rekt-ceo-meme');
          window.open(twitterUrl, '_blank');
          this._showToast('📥 Image downloaded! Attach it to your tweet.');
        }
      } else {
        // No element, just open Twitter
        window.open(twitterUrl, '_blank');
      }
    } catch (error) {
      console.error('Twitter share error:', error);
      this._showToast('Error sharing to Twitter. Please try again.');
    }
  }
  
  /**
   * Copy an image to clipboard
   * @param {Object} element - DOM element to capture
   * @returns {boolean} Success status
   */
  async copyImageToClipboard(element) {
    try {
      if (!element) return false;
      
      // Check if clipboard API is available
      if (!navigator.clipboard || !window.ClipboardItem) {
        console.log('Clipboard API not available');
        return false;
      }
      
      // Export element as PNG and convert to blob
      const dataURL = await exportNodeToPng(element);
      const response = await fetch(dataURL);
      const blob = await response.blob();
      
      // Create clipboard item and write to clipboard
      const clipboardItem = new ClipboardItem({
        'image/png': blob
      });
      
      await navigator.clipboard.write([clipboardItem]);
      console.log('Image copied to clipboard successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Share to Instagram
   * @param {Object} element - DOM element to capture
   * @param {string} topText - Top text of the content
   * @param {string} bottomText - Bottom text of the content
   * @param {string} customShareText - Custom share text (optional)
   * @param {string} fileName - File name for download
   */
  async shareToInstagram(element, topText = '', bottomText = '', customShareText = '', fileName = 'rekt-ceo') {
    try {
      // Instagram doesn't support direct sharing via URL
      // Just show instructions to download manually
      this._showToast('Instagram sharing: Use the download button first, then share the image manually.');
    } catch (error) {
      console.error('Instagram share error:', error);
      this._showToast('Error preparing for Instagram. Please try again.');
    }
  }

  /**
   * Share to Farcaster
   * @param {Object} element - DOM element to capture
   * @param {string} topText - Top text of the content
   * @param {string} bottomText - Bottom text of the content
   * @param {string} customShareText - Custom share text (optional)
   * @param {string} fileName - File name for download
   */
  async shareToFarcaster(element, topText = '', bottomText = '', customShareText = '', fileName = 'rekt-ceo') {
    try {
      // Farcaster sharing - similar to Twitter approach
      const shareText = customShareText || this._createShareText(topText, bottomText);
      const shareUrl = window.location.href;
      
      // For now, we'll show instructions since Farcaster integration might need specific setup
      this._showToast('Farcaster sharing coming soon! For now, download and share manually.');
    } catch (error) {
      console.error('Farcaster share error:', error);
      this._showToast('Error preparing for Farcaster. Please try again.');
    }
  }

  /**
   * Share to Reddit
   * @param {Object} element - DOM element to capture
   * @param {string} topText - Top text of the content
   * @param {string} bottomText - Bottom text of the content
   * @param {string} customShareText - Custom share text (optional)
   */
  async shareToReddit(element, topText = '', bottomText = '', customShareText = '') {
    try {
      const shareText = customShareText || this._createShareText(topText, bottomText);
      const shareUrl = window.location.href;
      
      // Open Reddit submit page
      const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
      window.open(redditUrl, '_blank');
      
      this._showToast('Reddit submit page opened! Download the image first, then attach it to your post.');
    } catch (error) {
      console.error('Reddit share error:', error);
      this._showToast('Error sharing to Reddit. Please try again.');
    }
  }

  /**
   * Create formatted share text from meme content
   * @param {string} topText - Top text of the meme
   * @param {string} bottomText - Bottom text of the meme
   * @returns {string} Formatted share text
   * @private
   */
  _createShareText(topText, bottomText) {
    if (topText && bottomText) {
      return `Check out my Rekt CEO meme: "${topText}" - "${bottomText}"`;
    } else if (topText) {
      return `Check out my Rekt CEO meme: "${topText}"`;
    } else if (bottomText) {
      return `Check out my Rekt CEO meme: "${bottomText}"`;
    } else {
      return 'Check out my awesome Rekt CEO meme!';
    }
  }

  /**
   * Show toast notification with fallback
   * @param {string} message - Message to display
   * @private
   */
  _showToast(message) {
    if (this.showToast && typeof this.showToast === 'function') {
      this.showToast(message);
    } else {
      // Fallback to console log if no toast function is provided
      console.log(message);
    }
  }
}

// Create and export a singleton instance
const sharingService = new SharingService();

export default sharingService;

// Also export the class for advanced usage
export { SharingService };