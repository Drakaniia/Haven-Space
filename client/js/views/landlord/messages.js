/**
 * Messages Page - Landlord Dashboard
 * Handles messaging functionality for landlords
 */

/**
 * Initialize messages page
 */
export function initMessages() {
  initConversationSwitching();
  initSearchMessages();
  initSendMessage();
  initNewMessageModal();
  initAttachmentDownload();
  scrollToBottom();
}

// Also init on DOMContentLoaded for direct page load
document.addEventListener('DOMContentLoaded', () => {
  initMessages();
});

/**
 * Handle conversation switching
 */
function initConversationSwitching() {
  const conversationItems = document.querySelectorAll('.conversation-item');
  const chatName = document.querySelector('.chat-name');
  const chatAvatar = document.querySelector('.chat-header .chat-avatar img');
  const chatStatus = document.querySelector('.chat-status');

  conversationItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class from all conversations
      conversationItems.forEach(conv => conv.classList.remove('active'));

      // Add active class to clicked conversation
      item.classList.add('active');

      // Update chat header with conversation info
      const name = item.querySelector('.conversation-name').textContent;
      const avatarSrc = item.querySelector('.conversation-avatar img').src;

      if (chatName) chatName.textContent = name;
      if (chatAvatar) chatAvatar.src = avatarSrc;

      // Clear search input if active
      const searchInput = document.getElementById('messages-search-input');
      if (searchInput) searchInput.value = '';

      // Scroll to bottom of chat
      scrollToBottom();
    });
  });
}

/**
 * Initialize search functionality
 */
function initSearchMessages() {
  const searchInput = document.getElementById('messages-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', e => {
    const searchTerm = e.target.value.toLowerCase();
    const conversationItems = document.querySelectorAll('.conversation-item');

    conversationItems.forEach(item => {
      const name = item.querySelector('.conversation-name').textContent.toLowerCase();
      const lastMessage = item
        .querySelector('.conversation-last-message')
        .textContent.toLowerCase();

      if (name.includes(searchTerm) || lastMessage.includes(searchTerm)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  });
}

/**
 * Initialize send message functionality
 */
function initSendMessage() {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const chatMessages = document.getElementById('chat-messages');

  if (!chatInput || !sendBtn || !chatMessages) return;

  // Send on button click
  sendBtn.addEventListener('click', () => {
    sendMessage();
  });

  // Send on Enter key
  chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function sendMessage() {
    const messageText = chatInput.value.trim();
    if (!messageText) return;

    // Create message element
    const messageItem = document.createElement('div');
    messageItem.className = 'message-item message-sent';
    messageItem.innerHTML = `
      <div class="message-content message-content-sent">
        <div class="message-bubble message-bubble-sent">
          <p>${escapeHtml(messageText)}</p>
        </div>
        <span class="message-time message-time-sent">
          ${getCurrentTime()}
          <svg class="message-read-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </span>
      </div>
    `;

    // Add to chat messages
    chatMessages.appendChild(messageItem);

    // Clear input
    chatInput.value = '';

    // Scroll to bottom
    scrollToBottom();

    // Simulate response after delay (for demo purposes)
    // TODO: Replace with actual backend integration
    setTimeout(() => simulateResponse(), 2000);
  }
}

/**
 * Initialize new message modal
 */
function initNewMessageModal() {
  const newMessageBtn = document.getElementById('messages-new-btn');
  const modal = document.getElementById('new-message-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const form = document.getElementById('new-message-form');

  if (!newMessageBtn || !modal) return;

  // Open modal
  newMessageBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  // Close modal functions
  function closeModal() {
    modal.style.display = 'none';
    form.reset();
  }

  // Close on close button click
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close on cancel button click
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // Close on overlay click
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Handle form submission
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();

      // Get form values
      const recipient = document.getElementById('message-recipient').value;
      const subject = document.getElementById('message-subject').value;
      const messageBody = document.getElementById('message-body').value;

      // TODO: Send to backend API
      console.log('New message:', { recipient, subject, messageBody });

      // Close modal and show success message
      closeModal();
      alert('Message sent successfully! (Demo - backend integration needed)');
    });
  }
}

/**
 * Initialize attachment download
 */
function initAttachmentDownload() {
  const downloadBtns = document.querySelectorAll('.message-attachment-download');

  downloadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const attachment = btn.closest('.message-attachment');
      const fileName = attachment.querySelector('.message-attachment-name').textContent;

      // TODO: Implement actual file download from backend
      console.log('Downloading:', fileName);
      alert(`Download started: ${fileName} (Demo - backend integration needed)`);
    });
  });
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

/**
 * Get current time in HH:MM AM/PM format
 */
function getCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Simulate a response (for demo purposes)
 * TODO: Remove when backend is integrated
 */
function simulateResponse() {
  const chatMessages = document.getElementById('chat-messages');
  const chatAvatar = document.querySelector('.chat-header .chat-avatar img');

  if (!chatMessages || !chatAvatar) return;

  const responses = [
    'Thanks for your message!',
    "I'll get back to you on that.",
    'Sure, no problem!',
    "Let me check and I'll let you know.",
    'Great! Talk to you soon.',
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  const messageItem = document.createElement('div');
  messageItem.className = 'message-item message-received';
  messageItem.innerHTML = `
    <div class="message-avatar">
      <img src="${chatAvatar.src}" alt="User avatar" />
    </div>
    <div class="message-content">
      <div class="message-bubble">
        <p>${randomResponse}</p>
      </div>
      <span class="message-time">${getCurrentTime()}</span>
    </div>
  `;

  chatMessages.appendChild(messageItem);
  scrollToBottom();
}
