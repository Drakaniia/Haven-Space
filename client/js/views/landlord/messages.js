/**
 * Messages Page - Landlord Dashboard
 * Handles messaging functionality for landlords with API integration
 */

import { getIcon } from '../../shared/icons.js';
import CONFIG from '../../config.js';

const API_BASE_URL = CONFIG.API_BASE_URL;
let currentConversationId = null;
let conversations = [];

// Simulation bypass for user ID
if (!localStorage.getItem('user_id')) {
  localStorage.setItem('user_id', '4'); // Simulated Landlord ID
}

export function initMessages() {
  loadConversations();
  initConversationSwitching();
  initSearchMessages();
  initSendMessage();
  initNewMessageModal();
  initAttachmentDownload();
  
  // Refresh conversations periodically
  setInterval(loadConversations, 10000);
}

document.addEventListener('DOMContentLoaded', () => {
  initMessages();
});

/**
 * Load conversations from API
 */
async function loadConversations() {
  const sidebar = document.getElementById('conversations-list');
  if (!sidebar) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Id': getCurrentUserId()
      },
    });
    
    if (!response.ok) throw new Error('Failed to load conversations');
    
    const result = await response.json();
    conversations = result.data || [];

    renderConversations(conversations);
    updateNotificationBadge();
  } catch (error) {
    console.error('Error loading conversations:', error);
  }
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
        ${getIcon('chat', { strokeWidth: '2' })}
        <p>No conversations yet</p>
      </div>
    `;
    return;
  }

  // Preserve active state if re-rendering
  const activeId = currentConversationId;

  sidebar.innerHTML = '';
  conversations.forEach(conv => {
    const item = createConversationItem(conv);
    if (activeId && parseInt(conv.id) === parseInt(activeId)) {
      item.classList.add('active');
    }
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
        <span class="message-preview">${escapeHtml(lastMessage)}</span>
      </div>
    </div>
  `;

  item.addEventListener('click', () => loadConversation(conv.id));
  return item;
}

/**
 * Load a specific conversation with messages
 */
async function loadConversation(conversationId) {
  currentConversationId = conversationId;

  // Update active state in UI
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.toggle('active', parseInt(item.dataset.conversationId) === parseInt(conversationId));
  });

  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/messages/conversations/${conversationId}`,
      {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': getCurrentUserId()
        },
      }
    );
    
    if (!response.ok) throw new Error('Failed to load conversation');
    
    const result = await response.json();
    const conv = result.data;

    // Update header
    updateChatHeader(conv);

    // Render messages
    renderMessages(conv.messages || []);

    // Scroll to bottom
    scrollToBottom();

    // Mark as read in UI immediately, backend handles DB update during load
    const convItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
    if (convItem) {
      convItem.classList.remove('unread');
      const badge = convItem.querySelector('.unread-badge');
      if (badge) badge.remove();
    }
  } catch (error) {
    console.error('Error loading conversation:', error);
    showError('Failed to load messages');
  }
}

/**
 * Update chat header
 */
function updateChatHeader(conv) {
  const chatName = document.querySelector('.chat-name');
  const chatStatus = document.querySelector('.chat-status');

  if (chatName) chatName.textContent = conv.title;
  if (chatStatus) chatStatus.textContent = conv.is_system_thread ? 'System Thread' : 'Online';
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
}

/**
 * Create message element
 */
function createMessageElement(msg) {
  const isSent = parseInt(msg.sender_id) === getCurrentUserId();
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
      ${!isSent && msg.sender_name ? `<span class="sender-name">${escapeHtml(msg.sender_name)}</span>` : ''}
      <div class="message-bubble ${isSent ? 'message-bubble-sent' : ''}">
        ${msg.message_text ? `<p>${escapeHtml(msg.message_text)}</p>` : ''}
        ${attachmentsHtml}
      </div>
      <span class="message-time">
        ${formatMessageTime(msg.created_at)}
        ${isSent ? getIcon('check', { className: 'message-read-icon', strokeWidth: '2' }) : ''}
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
          ${getIcon('paperClip', { strokeWidth: '2' })}
          <a href="${API_BASE_URL}/server/storage/uploads/${
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
 */
async function markAsRead(conversationId) {
  try {
    await fetch(`${API_BASE_URL}/api/messages/conversations/${conversationId}/read`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Id': getCurrentUserId()
      },
    });
  } catch (error) {
    console.error('Error marking as read:', error);
  }
}

function initConversationSwitching() {
  // Handled by loadConversation click handler
}

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

function filterConversations(searchTerm) {
  document.querySelectorAll('.conversation-item').forEach(item => {
    const name = item.querySelector('.conversation-name')?.textContent.toLowerCase() || '';
    const lastMessage =
      item.querySelector('.conversation-last-message')?.textContent.toLowerCase() || '';

    item.style.display =
      name.includes(searchTerm) || lastMessage.includes(searchTerm) ? 'flex' : 'none';
  });
}

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
 */
async function sendMessage() {
  const chatInput = document.getElementById('chat-input');
  if (!chatInput || !currentConversationId) return;

  const messageText = chatInput.value.trim();
  if (!messageText) return;

  chatInput.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Id': getCurrentUserId()
      },
      body: JSON.stringify({
        conversation_id: currentConversationId,
        message_text: messageText,
      }),
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }
  
    const result = await response.json();
  
    // Update local UI immediately for responsiveness
    renderMessages(result.data.messages || []);
    scrollToBottom();
  
    chatInput.value = '';
    
    // Refresh conversation list to update last message
    loadConversations();
  } catch (error) {
    console.error('Error sending message:', error);
    showError('Failed to send message. Please try again.');
  } finally {
    chatInput.disabled = false;
    chatInput.focus();
  }
}

function initNewMessageModal() {
  const newMessageBtn = document.getElementById('messages-new-btn');
  const modal = document.getElementById('new-message-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const form = document.getElementById('new-message-form');
  const recipientInput = document.getElementById('message-recipient');

  if (!newMessageBtn || !modal) return;

  // State for selected recipient
  let selectedRecipientId = null;

  newMessageBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    selectedRecipientId = null;
  });

  function closeModal() {
    modal.style.display = 'none';
    form?.reset();
    const existingDropdown = document.querySelector('.search-results-dropdown');
    if (existingDropdown) existingDropdown.remove();
  }

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // User search logic
  if (recipientInput) {
    let debounceTimer;
    recipientInput.addEventListener('input', e => {
      const query = e.target.value.trim();
      clearTimeout(debounceTimer);
      
      if (query.length < 2) {
        const existingDropdown = document.querySelector('.search-results-dropdown');
        if (existingDropdown) existingDropdown.remove();
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const roleToSearch = 'boarder'; // Landlords search for boarders
          const response = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}&role=${roleToSearch}`, {
            headers: { 'X-User-Id': getCurrentUserId() }
          });
          const result = await response.json();
          renderSearchResults(result.data, recipientInput);
        } catch (error) {
          console.error('Error searching users:', error);
        }
      }, 300);
    });
  }

  function renderSearchResults(users, input) {
    let dropdown = document.querySelector('.search-results-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'search-results-dropdown';
      input.parentNode.appendChild(dropdown);
    }

    if (users.length === 0) {
      dropdown.innerHTML = '<div class="search-result-item no-results">No users found</div>';
      return;
    }

    dropdown.innerHTML = users.map(user => `
      <div class="search-result-item" data-id="${user.id}">
        <div class="search-result-avatar">
          <img src="${user.avatar_url || '../../../assets/images/default-avatar.png'}" alt="">
        </div>
        <div class="search-result-info">
          <div class="search-result-name">${escapeHtml(user.name)}</div>
          <div class="search-result-email">${escapeHtml(user.email)}</div>
        </div>
      </div>
    `).join('');

    dropdown.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedRecipientId = item.dataset.id;
        input.value = item.querySelector('.search-result-name').textContent;
        dropdown.remove();
      });
    });
  }

  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const messageBody = document.getElementById('message-body')?.value;

    if (!selectedRecipientId || !messageBody) {
      showError('Please select a recipient and type a message');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/new`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': getCurrentUserId()
        },
        body: JSON.stringify({
          recipient_id: selectedRecipientId,
          message_text: messageBody,
        }),
      });

      if (!response.ok) throw new Error('Failed to start conversation');

      const result = await response.json();
      showSuccess('Message sent successfully!');
      closeModal();
      
      // Load the new conversation
      await loadConversations();
      if (result.data && result.data.id) {
        loadConversation(result.data.id);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      showError('Failed to send message');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

function initAttachmentDownload() {
  // Handled by anchor download attribute in renderAttachments
}

/**
 * Update notification badge with unread count
 */
async function updateNotificationBadge() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/messages/unread-count`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Id': getCurrentUserId()
      },
    });
  
    if (response.ok) {
      const result = await response.json();
      const count = result.data?.unread_count || 0;
  
      const badge = document.getElementById('notification-badge');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
      }
    }
  } catch (error) {
    console.error('Error updating notification badge:', error);
  }
}

function formatMessageTime(dateString) {
  if (!dateString) return '';
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

function formatRelativeTime(dateString) {
  if (!dateString) return '';
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

function getCurrentUserId() {
  return parseInt(localStorage.getItem('user_id') || '0');
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'toast-message toast-error';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  setTimeout(() => errorDiv.remove(), 3000);
}

function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'toast-message toast-success';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);

  setTimeout(() => successDiv.remove(), 3000);
}

function scrollToBottom() {
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
