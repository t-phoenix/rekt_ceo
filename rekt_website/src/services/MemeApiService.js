/**
 * MemeApiService - Service for interacting with the meme generation API
 */

const API_BASE_URL = 'https://rekt-automations.onrender.com';

class MemeApiService {
    /**
     * Generate meme text options based on topic and template image
     * @param {string} topic - The topic text or full Twitter post
     * @param {boolean} isTwitterPost - True if input is a full Twitter post
     * @param {File} templateImage - The template image file
     * @param {Object} options - Optional parameters (tone, humor_type)
     * @returns {Promise<{options: Array, metadata: Object}>}
     */
    async generateMemeText(topic, isTwitterPost = false, templateImage, options = {}) {
        try {
            const formData = new FormData();

            // Add the topic text
            formData.append('topic', topic);

            // Add is_twitter_post flag
            formData.append('is_twitter_post', isTwitterPost.toString());

            // Add template image
            formData.append('template_image', templateImage);

            // Add optional parameters if provided
            if (options.tone) {
                formData.append('tone', options.tone);
            }
            if (options.humor_type) {
                formData.append('humor_type', options.humor_type);
            }

            const response = await fetch(`${API_BASE_URL}/api/meme/generate`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API request failed with status ${response.status}`);
            }

            const data = await response.json();

            if (!data.options || !Array.isArray(data.options) || data.options.length === 0) {
                throw new Error('Invalid response format from API');
            }

            return {
                options: data.options,
                metadata: data.metadata
            };
        } catch (error) {
            console.error('Error generating meme text:', error);
            throw error;
        }
    }

    /**
     * Generate AI-branded meme template by intelligently blending brand elements
     * @param {File} templateImage - Meme template image (JPEG, PNG, WebP)
     * @param {string} brandName - Brand name (1-50 characters)
     * @param {string} primaryColor - Primary brand color in hex format (e.g., #00D4FF)
     * @param {string} userPrompt - How to blend brand (10-500 characters)
     * @param {string} secondaryColor - Optional secondary brand color in hex format
     * @param {File} logoImage - Optional brand logo image
     * @returns {Promise<{brandedTemplateBase64: string, metadata: Object}>}
     */
    async generateBrandedTemplate(
        templateImage,
        brandName,
        primaryColor,
        userPrompt,
        secondaryColor = null,
        logoImage = null
    ) {
        try {
            const formData = new FormData();

            // Add required fields
            formData.append('template_image', templateImage);
            formData.append('brand_name', brandName);
            formData.append('primary_color', primaryColor);
            formData.append('user_prompt', userPrompt);

            // Add optional fields if provided
            if (secondaryColor) {
                formData.append('secondary_color', secondaryColor);
            }
            if (logoImage) {
                formData.append('logo_image', logoImage);
            }

            const response = await fetch(`${API_BASE_URL}/api/meme/template/brand`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API request failed with status ${response.status}`);
            }

            const data = await response.json();

            if (!data.branded_template_base64) {
                throw new Error('Invalid response format from API');
            }

            return {
                brandedTemplateBase64: data.branded_template_base64,
                metadata: data.metadata
            };
        } catch (error) {
            console.error('Error generating branded template:', error);
            throw error;
        }
    }

    /**
     * Check if the API is reachable
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET'
            });
            return response.ok;
        } catch (error) {
            console.error('API health check failed:', error);
            return false;
        }
    }
}

// Export a singleton instance
const memeApiService = new MemeApiService();
export default memeApiService;
