/**
 * Messages Page - Boarder Dashboard
 * Handles messaging functionality for boarders with API integration
 */

const API_BASE_URL = 'http://localhost:8000';

let currentConversationId = null;
let conversations = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadConversations();
  initConversationSwitching();
  initSearchMessages();
  initSendMessage();
  initNewMessageModal();
  initAttachmentDownload();
});

/**
 * Load conversations from API
 * TODO: Implement backend API endpoint for fetching conversations
 * For now, using mock data to display the UI
 */
async function loadConversations() {
  const sidebar = document.getElementById('conversations-list');
  if (!sidebar) return;

  // TODO: Replace with actual API call when backend is ready
  // const response = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // });
  // if (!response.ok) throw new Error('Failed to load conversations');
  // const result = await response.json();
  // conversations = result.data || [];

  // Mock data for UI display
  conversations = [
    {
      id: 1,
      title: 'Welcome Thread',
      last_message: 'Welcome to your new boarding house!',
      last_message_at: new Date().toISOString(),
      unread_count: 1,
      type: 'welcome',
    },
    {
      id: 2,
      title: 'Landlord - John Smith',
      last_message: 'The room is ready for viewing.',
      last_message_at: new Date(Date.now() - 3600000).toISOString(),
      unread_count: 0,
      type: 'direct',
    },
  ];

  renderConversations(conversations);
  updateNotificationBadge();
}

/**
 * Render conversation list
 */
function renderConversations(conversations) {
  const sidebar = document.getElementById('conversations-list');
  if (!sidebar) return;

  if (conversations.length === 0) {
    sidebar.innerHTML = `
      <div class="empty-conversations">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p>No conversations yet</p>
      </div>
    `;
    return;
  }

  sidebar.innerHTML = '';
  conversations.forEach(conv => {
    const item = createConversationItem(conv);
    sidebar.appendChild(item);
  });
}

/**
 * Create conversation list item
 */
function createConversationItem(conv) {
  const item = document.createElement('div');
  item.className = 'conversation-item';
  item.dataset.conversationId = conv.id;
  if (conv.unread_count > 0) item.classList.add('unread');

  const lastMessage = conv.last_message || 'No messages yet';
  const lastMessageAt = conv.last_message_at ? formatRelativeTime(conv.last_message_at) : '';

  item.innerHTML = `
    <div class="conversation-avatar">
      <img src="../../../assets/images/default-avatar.png" alt="Avatar" />
    </div>
    <div class="conversation-info">
      <div class="conversation-header-row">
        <span class="conversation-name">${escapeHtml(conv.title)}</span>
        <span class="conversation-time">${lastMessageAt}</span>
      </div>
      <div class="conversation-last-message">
        ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count}</span>` : ''}
        ${escapeHtml(lastMessage)}
      </div>
    </div>
  `;

  item.addEventListener('click', () => loadConversation(conv.id));
  return item;
}

/**
 * Load a specific conversation with messages
 * TODO: Implement backend API endpoint for fetching conversation messages
 * For now, using mock data to display the UI
 */
async function loadConversation(conversationId) {
  currentConversationId = conversationId;

  // Update active state
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.toggle('active', parseInt(item.dataset.conversationId) === conversationId);
  });

  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  // TODO: Replace with actual API call when backend is ready
  // const response = await fetch(
  //   `${API_BASE_URL}/api/messages/conversations/${conversationId}`,
  //   {
  //     method: 'GET',
  //     headers: { 'Content-Type': 'application/json' },
  //   }
  // );
  // if (!response.ok) throw new Error('Failed to load conversation');
  // const result = await response.json();
  // const conv = result.data;

  // Mock data for UI display
  const mockConversation = {
    id: conversationId,
    title: conversationId === 1 ? 'Welcome Thread' : 'Landlord - John Smith',
    type: conversationId === 1 ? 'welcome' : 'direct',
    messages: [
      {
        id: 1,
        sender_id: conversationId === 1 ? 999 : 2,
        message_text:
          conversationId === 1
            ? 'Welcome to your new boarding house! Feel free to ask any questions.'
            : 'The room is ready for viewing.',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        attachments: [],
      },
      {
        id: 2,
        sender_id: 1,
        message_text: "Thank you! I'd love to schedule a viewing.",
        created_at: new Date(Date.now() - 3600000).toISOString(),
        attachments: [],
      },
    ],
  };

  // Update header
  updateChatHeader(mockConversation);

  // Render messages
  renderMessages(mockConversation.messages || []);

  // Mark as read
  await markAsRead(conversationId);
}

/**
 * Update chat header
 */
function updateChatHeader(conv) {
  const chatName = document.querySelector('.chat-name');
  const chatStatus = document.querySelector('.chat-status');

  if (chatName) chatName.textContent = conv.title;
  if (chatStatus) chatStatus.textContent = conv.type === 'welcome' ? 'Welcome Thread' : 'Online';
}

/**
 * Render messages in chat area
 */
function renderMessages(messages) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  chatMessages.innerHTML = '';

  if (messages.length === 0) {
    chatMessages.innerHTML =
      '<div class="empty-messages">No messages yet. Start the conversation!</div>';
    return;
  }

  messages.forEach(msg => {
    const messageItem = createMessageElement(msg);
    chatMessages.appendChild(messageItem);
  });

  scrollToBottom();
}

/**
 * Create message element
 */
function createMessageElement(msg) {
  const isSent = msg.sender_id === getCurrentUserId();
  const messageItem = document.createElement('div');
  messageItem.className = `message-item ${isSent ? 'message-sent' : 'message-received'}`;

  const attachmentsHtml =
    msg.attachments && msg.attachments.length > 0 ? renderAttachments(msg.attachments) : '';

  messageItem.innerHTML = `
    ${
      !isSent
        ? '<div class="message-avatar"><img src="../../../assets/images/default-avatar.png" alt="Avatar" /></div>'
        : ''
    }
    <div class="message-content ${isSent ? 'message-content-sent' : ''}">
      <div class="message-bubble ${isSent ? 'message-bubble-sent' : ''}">
        ${msg.message_text ? `<p>${escapeHtml(msg.message_text)}</p>` : ''}
        ${attachmentsHtml}
      </div>
      <span class="message-time">
        ${formatMessageTime(msg.created_at)}
        ${
          isSent
            ? '<svg class="message-read-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
            : ''
        }
      </span>
    </div>
  `;

  return messageItem;
}

/**
 * Render message attachments
 */
function renderAttachments(attachments) {
  return `
    <div class="message-attachments">
      ${attachments
        .map(
          att => `
        <div class="message-attachment">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <a href="/server/storage/uploads/${
            att.file_url
          }" download class="message-attachment-download">
            ${escapeHtml(att.file_name)}
          </a>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Mark conversation as read
 * TODO: Implement backend API endpoint for marking messages as read
 */
async function markAsRead(conversationId) {
  // TODO: Replace with actual API call when backend is ready
  // try {
  //   await fetch(`${API_BASE_URL}/api/messages/conversations/${conversationId}/read`, {
  //     method: 'PUT',
  //     headers: { 'Content-Type': 'application/json' },
  //   });

  // Update UI
  const convItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
  if (convItem) {
    convItem.classList.remove('unread');
    const badge = convItem.querySelector('.unread-badge');
    if (badge) badge.remove();
  }
  // } catch (error) {
  //   console.error('Error marking as read:', error);
  // }
}

/**
 * Handle conversation switching
 */
function initConversationSwitching() {
  // Already handled by loadConversation click handler
}

/**
 * Initialize search functionality
 */
function initSearchMessages() {
  const searchInput = document.getElementById('messages-search-input');
  if (!searchInput) return;

  let debounceTimer;
  searchInput.addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const searchTerm = e.target.value.toLowerCase();
      filterConversations(searchTerm);
    }, 300);
  });
}

/**
 * Filter conversations by search term
 */
function filterConversations(searchTerm) {
  document.querySelectorAll('.conversation-item').forEach(item => {
    const name = item.querySelector('.conversation-name')?.textContent.toLowerCase() || '';
    const lastMessage =
      item.querySelector('.conversation-last-message')?.textContent.toLowerCase() || '';

    item.style.display =
      name.includes(searchTerm) || lastMessage.includes(searchTerm) ? 'flex' : 'none';
  });
}

/**
 * Initialize send message functionality
 */
function initSendMessage() {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  if (!chatInput || !sendBtn) return;

  sendBtn.addEventListener('click', () => sendMessage());
  chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

/**
 * Send a message
 * TODO: Implement backend API endpoint for sending messages
 */
async function sendMessage() {
  const chatInput = document.getElementById('chat-input');
  if (!chatInput || !currentConversationId) return;

  const messageText = chatInput.value.trim();
  if (!messageText) return;

  // Disable input while sending
  chatInput.disabled = true;

  // TODO: Replace with actual API call when backend is ready
  // try {
  //   const response = await fetch(`${API_BASE_URL}/api/messages`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       conversation_id: currentConversationId,
  //       message_text: messageText,
  //     }),
  //   });
  //
  //   if (!response.ok) {
  //     const error = await response.json();
  //     throw new Error(error.error || 'Failed to send message');
  //   }
  //
  //   const result = await response.json();
  //
  //   // Reload conversation to show the sent message
  //   await loadConversation(currentConversationId);
  //
  //   chatInput.value = '';
  // } catch (error) {
  //   console.error('Error sending message:', error);
  //   showError('Failed to send message. Please try again.');
  // } finally {
  //   chatInput.disabled = false;
  //   chatInput.focus();
  // }

  // Mock: Simulate sending a message
  const mockMessage = {
    id: Date.now(),
    sender_id: getCurrentUserId(),
    message_text: messageText,
    created_at: new Date().toISOString(),
    attachments: [],
  };

  // Add message to UI
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    const messageItem = createMessageElement(mockMessage);
    chatMessages.appendChild(messageItem);
    scrollToBottom();
  }

  chatInput.value = '';
  chatInput.disabled = false;
  chatInput.focus();
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

  newMessageBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  function closeModal() {
    modal.style.display = 'none';
    form?.reset();
  }

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const recipient = document.getElementById('message-recipient')?.value;
    const messageBody = document.getElementById('message-body')?.value;

    if (!recipient || !messageBody) {
      showError('Please fill in all fields');
      return;
    }

    // TODO: Create new conversation with recipient
    // For now, this would need a separate endpoint
    closeModal();
    showSuccess('Message sent successfully!');
  });
}

/**
 * Initialize attachment download
 */
function initAttachmentDownload() {
  // Handled by anchor download attribute in renderAttachments
}

/**
 * Update notification badge with unread count
 * TODO: Implement backend API endpoint for unread count
 */
async function updateNotificationBadge() {
  // TODO: Replace with actual API call when backend is ready
  // try {
  //   const response = await fetch(`${API_BASE_URL}/api/messages/unread-count`, {
  //     method: 'GET',
  //     headers: { 'Content-Type': 'application/json' },
  //   });
  //
  //   if (response.ok) {
  //     const result = await response.json();
  //     const count = result.data?.unread_count || 0;
  //
  //     const badge = document.getElementById('notification-badge');
  //     if (badge) {
  //       badge.textContent = count;
  //       badge.style.display = count > 0 ? 'block' : 'none';
  //     }
  //   }
  // } catch (error) {
  //   console.error('Error updating notification badge:', error);
  // }

  // Mock: Calculate total unread from mock data
  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
  const badge = document.getElementById('notification-badge');
  if (badge) {
    badge.textContent = totalUnread;
    badge.style.display = totalUnread > 0 ? 'block' : 'none';
  }
}

/**
 * Format message time
 */
function formatMessageTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get current user ID from state
 */
function getCurrentUserId() {
  // TODO: Get from auth state or JWT token
  return parseInt(localStorage.getItem('user_id') || '0');
}

/**
 * Show error message
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'toast-message toast-error';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  setTimeout(() => errorDiv.remove(), 3000);
}

/**
 * Show success message
 */
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'toast-message toast-success';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);

  setTimeout(() => successDiv.remove(), 3000);
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
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
