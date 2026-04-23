/**
 * Haven AI Landing Page
 * Handles interactive elements on the Haven AI feature page
 */

import AIService from '../../services/AIService.js';

/**
 * Initialize Haven AI page interactions
 */
export function initHavenAIPage() {
  initSmoothScrolling();
  initNavbarScroll();
  initAIDemo();
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });
}

/**
 * Navbar scroll effect for floating header
 */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 50) {
          navbar.classList.add('navbar-scrolled');
        } else {
          navbar.classList.remove('navbar-scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  });
}

/**
 * Initialize interactive AI demo
 */
function initAIDemo() {
  const demoInput = document.getElementById('demo-user-input');
  const demoSendButton = document.getElementById('demo-send-button');
  const demoChat = document.getElementById('demo-chat');

  if (!demoInput || !demoSendButton || !demoChat) {
    console.warn('AI demo elements not found');
    return;
  }

  // Function to add user message to chat
  function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'demo-message demo-user-message';
    messageDiv.innerHTML = `
      <div class="demo-message-content">
        <p>${text}</p>
      </div>
      <div class="demo-message-avatar">
        <span data-icon="user" data-icon-width="18" data-icon-height="18" data-icon-stroke-width="2"></span>
      </div>
    `;
    demoChat.appendChild(messageDiv);
    demoChat.scrollTop = demoChat.scrollHeight;
    return messageDiv;
  }

  // Function to add AI message to chat
  function addAIMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'demo-message demo-ai-message';
    messageDiv.innerHTML = `
      <div class="demo-message-avatar demo-ai-avatar">
        <span data-icon="sparkles" data-icon-width="18" data-icon-height="18" data-icon-stroke-width="2"></span>
      </div>
      <div class="demo-message-content">
        <p>${text}</p>
      </div>
    `;
    demoChat.appendChild(messageDiv);
    demoChat.scrollTop = demoChat.scrollHeight;
    return messageDiv;
  }

  // Function to add typing indicator
  function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'demo-message demo-ai-message';
    messageDiv.innerHTML = `
      <div class="demo-message-avatar demo-ai-avatar">
        <span data-icon="sparkles" data-icon-width="18" data-icon-height="18" data-icon-stroke-width="2"></span>
      </div>
      <div class="demo-message-content">
        <p class="demo-typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </p>
      </div>
    `;
    demoChat.appendChild(messageDiv);
    demoChat.scrollTop = demoChat.scrollHeight;
    return messageDiv;
  }

  // Handle form submission with real AI
  async function handleSubmit() {
    const userInput = demoInput.value.trim();

    if (!userInput) return;

    // Disable input during processing
    demoInput.disabled = true;
    demoSendButton.disabled = true;

    // Add user message
    addUserMessage(userInput);

    // Clear input
    demoInput.value = '';

    // Show typing indicator
    const typingIndicator = addTypingIndicator();

    try {
      // Call real AI service
      const response = await AIService.chat(userInput);

      if (response.success && response.response) {
        // Remove typing indicator
        typingIndicator.remove();

        // Add real AI response
        addAIMessage(response.response);
      } else {
        // Fallback if AI fails
        typingIndicator.remove();
        addAIMessage(
          "Sorry, I'm having trouble connecting to the AI service. Please try again later."
        );
      }
    } catch (error) {
      // Error handling
      typingIndicator.remove();
      addAIMessage('Sorry, there was an error processing your request. Please try again.');
      console.error('AI chat error:', error);
    }

    // Re-enable input
    demoInput.disabled = false;
    demoSendButton.disabled = false;
    demoInput.focus();
  }

  // Event listeners
  demoSendButton.addEventListener('click', handleSubmit);

  demoInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  });

  // Add initial welcome message after a delay
  setTimeout(() => {
    addAIMessage(
      "Hello! I'm Haven AI, your smart boarding house assistant. Ask me anything about finding rooms!"
    );
  }, 2000);
}
