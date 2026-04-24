/**
 * AI Service - Client-side interface for Groq AI features
 * Provides methods to interact with all AI-powered endpoints
 */

import CONFIG from '../config.js';

class AIService {
  static async parseJsonResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    if (!contentType.includes('application/json')) {
      throw new Error(
        `Expected JSON response but received ${contentType || 'unknown content type'}`
      );
    }

    try {
      return JSON.parse(rawText);
    } catch (error) {
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
  }

  /**
   * Generate property description using AI
   * @param {Object} propertyDetails - Property features and details
   * @returns {Promise<Object>} AI-generated description
   */
  static async generateDescription(propertyDetails) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/ai/generate-description`, {
        method: 'POST',
        headers: AIService.getAuthHeaders(),
        body: JSON.stringify({ property_details: propertyDetails }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await AIService.parseJsonResponse(response);
    } catch (error) {
      console.error('AI description generation failed:', error);
      return {
        success: false,
        error: 'Failed to generate description. Please try again.',
      };
    }
  }

  /**
   * Enhance search query using AI
   * @param {Object} searchParams - Search query and parameters
   * @returns {Promise<Object>} Enhanced search analysis
   */
  static async enhanceSearch(searchParams) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/ai/enhance-search`, {
        method: 'POST',
        headers: AIService.getAuthHeaders(),
        body: JSON.stringify(searchParams),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await AIService.parseJsonResponse(response);
    } catch (error) {
      console.error('AI search enhancement failed:', error);
      return {
        success: false,
        error: 'Search enhancement unavailable. Using basic search.',
      };
    }
  }

  /**
   * Analyze maintenance issue using AI
   * @param {Object} issueData - Maintenance issue details
   * @returns {Promise<Object>} Issue analysis and categorization
   */
  static async analyzeIssue(issueData) {
    try {
      const response = await fetch('/api/ai/analyze-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(issueData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await AIService.parseJsonResponse(response);
    } catch (error) {
      console.error('AI issue analysis failed:', error);
      return {
        success: false,
        error: 'Issue analysis unavailable. Please describe your problem.',
      };
    }
  }

  /**
   * Draft message using AI
   * @param {Object} messageContext - Message context and parameters
   * @returns {Promise<Object>} Message drafts with different tones
   */
  static async draftMessage(messageContext) {
    try {
      const response = await fetch('/api/ai/draft-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messageContext),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await AIService.parseJsonResponse(response);
    } catch (error) {
      console.error('AI message drafting failed:', error);
      return {
        success: false,
        error: 'Message suggestions unavailable. Please write your message manually.',
      };
    }
  }

  /**
   * Analyze application using AI (Landlord only)
   * @param {Object} applicationData - Application details
   * @returns {Promise<Object>} Application analysis and recommendation
   */
  static async analyzeApplication(applicationData) {
    try {
      const response = await fetch('/api/ai/analyze-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await AIService.parseJsonResponse(response);
    } catch (error) {
      console.error('AI application analysis failed:', error);
      return {
        success: false,
        error: 'Application analysis unavailable. Please review manually.',
      };
    }
  }

  /**
   * Get authentication headers if token is available
   * @returns {Object} Headers object with auth if available
   */
  static getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Add auth token if available (for authenticated users)
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Chat with Haven AI assistant
   * @param {string} message - User message
   * @returns {Promise<Object>} AI response
   */
  static async chat(message) {
    try {
      // For Appwrite functions, we need to send the request in a specific format
      const requestBody = {
        method: 'POST',
        path: '/api/chat',
        body: JSON.stringify({ message: message }),
      };

      const response = await fetch(CONFIG.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await AIService.parseJsonResponse(response);

      // Extract the actual response from Appwrite function execution result
      if (result.responseBody) {
        return JSON.parse(result.responseBody);
      }

      return result;
    } catch (error) {
      console.error('AI chat failed:', error);
      return {
        success: false,
        error: 'AI assistant unavailable. Please try again later.',
      };
    }
  }

  /**
   * Show loading indicator for AI operations
   * @param {HTMLElement} element - Element to show loading in
   * @param {string} message - Loading message
   */
  static showLoading(element, message = 'AI is thinking...') {
    if (element) {
      element.innerHTML = `
                <div class="ai-loading">
                    <div class="spinner"></div>
                    <span>${message}</span>
                </div>
            `;
    }
  }

  /**
   * Show AI suggestion bubble
   * @param {HTMLElement} element - Element to attach suggestion to
   * @param {string} suggestion - Suggestion text
   * @param {Function} onAccept - Callback when suggestion is accepted
   */
  static showSuggestion(element, suggestion, onAccept) {
    if (element) {
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'ai-suggestion-bubble';
      suggestionElement.innerHTML = `
                <div class="ai-suggestion-content">
                    ${suggestion}
                </div>
                <div class="ai-suggestion-actions">
                    <button class="btn-accept" onclick="this.parentElement.parentElement.remove(); ${onAccept.toString()}">Use this</button>
                    <button class="btn-dismiss" onclick="this.parentElement.parentElement.remove()">Dismiss</button>
                </div>
            `;
      element.appendChild(suggestionElement);
    }
  }

  /**
   * Check if AI features are likely available
   * @returns {boolean} True if AI features should be available
   */
  static isAVAILable() {
    // In production, you might want to check this from a config endpoint
    return true;
  }
}

// Export for module systems if needed
export default AIService;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
}
if (typeof window !== 'undefined') {
  window.AIService = AIService;
}
