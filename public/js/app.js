// Client-side Application Logic for Lab 4
const state = {
  token: localStorage.getItem('jwt_token') || '',
  user: JSON.parse(localStorage.getItem('user_data') || 'null'),
  activeRoom: 'general',
  socket: null
};

// UI Elements
const authStatusText = document.getElementById('authStatusText');
const headerAuthStatus = document.getElementById('headerAuthStatus');
const logoutBtn = document.getElementById('logoutBtn');
const jwtTokenDisplay = document.getElementById('jwtTokenDisplay');
const decodedPayload = document.getElementById('decodedPayload');
const toastNotification = document.getElementById('toastNotification');

// Tabs Navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    const targetPane = document.getElementById(`tab-${tab.dataset.tab}`);
    if (targetPane) targetPane.classList.add('active');

    if (tab.dataset.tab === 'notes' && state.token) loadNotes();
    if (tab.dataset.tab === 'events') loadEvents();
  });
});

function showToast(message, type = 'success') {
  toastNotification.textContent = message;
  toastNotification.className = `toast show ${type}`;
  setTimeout(() => {
    toastNotification.className = 'toast';
  }, 3500);
}

function updateAuthStateUI() {
  const indicator = headerAuthStatus.querySelector('.status-indicator');
  if (state.token && state.user) {
    indicator.className = 'status-indicator online';
    authStatusText.innerHTML = `Signed in as <strong>${state.user.username}</strong> (${state.user.role.toUpperCase()})`;
    logoutBtn.style.display = 'inline-flex';
    jwtTokenDisplay.textContent = state.token;

    // Decode JWT payload (payload is part 1 of token)
    try {
      const base64Url = state.token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      decodedPayload.textContent = `Decoded JWT Payload:\n` + JSON.stringify(JSON.parse(jsonPayload), null, 2);
    } catch {
      decodedPayload.textContent = '';
    }
  } else {
    indicator.className = 'status-indicator offline';
    authStatusText.textContent = 'Not Authenticated';
    logoutBtn.style.display = 'none';
    jwtTokenDisplay.textContent = 'No active JWT token. Please sign up or log in.';
    decodedPayload.textContent = '';
  }
}

// Quick fill buttons
document.getElementById('fillAdmin')?.addEventListener('click', () => {
  document.getElementById('loginEmail').value = 'admin@example.com';
  document.getElementById('loginPassword').value = 'admin123';
});

document.getElementById('fillUser')?.addEventListener('click', () => {
  document.getElementById('loginEmail').value = 'john@example.com';
  document.getElementById('loginPassword').value = 'john123';
});

// Copy & Clear token buttons
document.getElementById('copyTokenBtn')?.addEventListener('click', () => {
  if (!state.token) return showToast('No token to copy!', 'error');
  navigator.clipboard.writeText(state.token);
  showToast('JWT Token copied to clipboard!');
});

document.getElementById('clearTokenBtn')?.addEventListener('click', () => {
  logout();
  showToast('Token cleared. Protected routes will now return 401 Unauthorized.', 'error');
});

logoutBtn?.addEventListener('click', logout);

function logout() {
  state.token = '';
  state.user = null;
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_data');
  updateAuthStateUI();
  if (state.socket) {
    state.socket.disconnect();
    initSocketConnection();
  }
}

// ---------------------------------------------------------
// 1. Authentication Handlers (Signup / Login)
// ---------------------------------------------------------
const signupForm = document.getElementById('signupForm');
signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const role = document.getElementById('signupRole').value;

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Signup failed');

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('jwt_token', data.token);
    localStorage.setItem('user_data', JSON.stringify(data.user));

    updateAuthStateUI();
    showToast(`User ${data.user.username} registered with role: ${data.user.role}!`);
    signupForm.reset();
    initSocketConnection();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

const loginForm = document.getElementById('loginForm');
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Login failed');

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('jwt_token', data.token);
    localStorage.setItem('user_data', JSON.stringify(data.user));

    updateAuthStateUI();
    showToast(`Welcome back, ${data.user.username}! Role: ${data.user.role}`);
    loginForm.reset();
    initSocketConnection();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ---------------------------------------------------------
// 2. Notes API CRUD Handlers
// ---------------------------------------------------------
const createNoteForm = document.getElementById('createNoteForm');
createNoteForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.token) {
    return showToast('You must be logged in to create notes!', 'error');
  }

  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  const tagsStr = document.getElementById('noteTags').value.trim();
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : [];

  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ title, content, tags })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Failed to create note');

    showToast('Note created securely!');
    createNoteForm.reset();
    loadNotes();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function loadNotes() {
  const container = document.getElementById('notesContainer');
  if (!state.token) {
    container.innerHTML = `<div class="card" style="border-color: #ef4444;"><p style="color:#ef4444;">🔒 No JWT Token provided. Protected routes return 401 Unauthorized.</p></div>`;
    return;
  }

  try {
    const res = await fetch('/api/notes', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    if (data.notes.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No notes found. Create your first secure note using the form on the left.</p>';
      return;
    }

    container.innerHTML = data.notes.map(note => `
      <div class="note-card" id="note-${note.id || note._id}">
        <div class="note-header">
          <span class="note-title">${escapeHtml(note.title)}</span>
          <div class="note-actions">
            <button class="btn btn-sm btn-danger" onclick="deleteNote('${note.id || note._id}')">Delete</button>
          </div>
        </div>
        <div class="note-content">${escapeHtml(note.content)}</div>
        <div class="note-tags">
          ${(note.tags || []).map(t => `<span class="note-tag">#${escapeHtml(t)}</span>`).join('')}
          <span style="font-size:0.7rem; color:var(--text-muted); margin-left:auto;">${new Date(note.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444;">Error loading notes: ${escapeHtml(err.message)}</p>`;
  }
}

window.deleteNote = async function(id) {
  if (!confirm('Are you sure you want to delete this note?')) return;
  try {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    showToast('Note deleted successfully');
    loadNotes();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

document.getElementById('refreshNotesBtn')?.addEventListener('click', loadNotes);

document.getElementById('testUnauthenticatedNotes')?.addEventListener('click', async () => {
  try {
    // Deliberately make request without Authorization header
    const res = await fetch('/api/notes');
    const data = await res.json();
    alert(`Server Response (${res.status} ${res.statusText}):\n\n${JSON.stringify(data, null, 2)}`);
  } catch (err) {
    alert('Request failed: ' + err.message);
  }
});

// ---------------------------------------------------------
// 3. Socket.IO Real-Time Chat
// ---------------------------------------------------------
function initSocketConnection() {
  if (state.socket) {
    state.socket.disconnect();
  }

  const socketOptions = {
    auth: {
      token: state.token,
      username: state.user ? state.user.username : `Guest_${Math.floor(Math.random() * 9000 + 1000)}`
    }
  };

  const socket = io(window.location.origin, socketOptions);
  state.socket = socket;

  const socketStatusText = document.getElementById('socketStatusText');
  const chatMessages = document.getElementById('chatMessages');
  const activeCountBadge = document.getElementById('activeCountBadge');
  const activeUsersList = document.getElementById('activeUsersList');

  socket.on('connect', () => {
    socketStatusText.textContent = `Connected as ${socketOptions.auth.username} (Socket: ${socket.id})`;
    socket.emit('join_room', state.activeRoom);
  });

  socket.on('disconnect', () => {
    socketStatusText.textContent = 'Disconnected from server.';
  });

  socket.on('active_users', (users) => {
    if (activeCountBadge) activeCountBadge.textContent = `${users.length} Online`;
    if (activeUsersList) {
      activeUsersList.innerHTML = users.map(u => `
        <li><strong>${escapeHtml(u.username)}</strong> <span style="font-size:0.7rem; color:var(--text-muted);">(${escapeHtml(u.role)})</span></li>
      `).join('');
    }
  });

  socket.on('receive_message', (msg) => {
    const isSelf = state.user && msg.sender === state.user.username;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${isSelf ? 'self' : 'other'}`;
    msgDiv.innerHTML = `
      <div class="msg-header">
        <strong>${escapeHtml(msg.sender)}</strong>
        <span>${escapeHtml(msg.timestamp)}</span>
      </div>
      <div>${escapeHtml(msg.message)}</div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  socket.on('system_message', (sys) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message system';
    msgDiv.textContent = `[${sys.timestamp}] ${sys.text}`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  socket.on('user_typing', (data) => {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
      typingIndicator.textContent = `${data.username} is typing...`;
      typingIndicator.style.display = 'block';
    }
  });

  socket.on('user_stop_typing', () => {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) typingIndicator.style.display = 'none';
  });
}

// Room buttons switch
document.querySelectorAll('.room-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeRoom = btn.dataset.room;
    document.getElementById('currentRoomHeader').textContent = `Room: #${state.activeRoom}`;
    if (state.socket) {
      state.socket.emit('join_room', state.activeRoom);
    }
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `<div class="chat-message system">Switched to #${state.activeRoom}</div>`;
  });
});

// Chat input form
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
chatForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !state.socket) return;

  state.socket.emit('chat_message', {
    room: state.activeRoom,
    message: text
  });
  chatInput.value = '';
  state.socket.emit('stop_typing', { room: state.activeRoom });
});

let typingTimer;
chatInput?.addEventListener('input', () => {
  if (!state.socket) return;
  state.socket.emit('typing', { room: state.activeRoom });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    state.socket.emit('stop_typing', { room: state.activeRoom });
  }, 1000);
});

// ---------------------------------------------------------
// 4. RBAC Verification Endpoints
// ---------------------------------------------------------
const rbacResponseDisplay = document.getElementById('rbacResponseDisplay');

async function testEndpoint(url, headers = {}) {
  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    rbacResponseDisplay.textContent = `HTTP ${res.status} ${res.statusText}\n` +
      `URL: ${url}\n` +
      `Response:\n` + JSON.stringify(data, null, 2);
  } catch (err) {
    rbacResponseDisplay.textContent = `Error: ${err.message}`;
  }
}

document.getElementById('testUserProfileBtn')?.addEventListener('click', () => {
  testEndpoint('/api/protected/profile', { 'Authorization': `Bearer ${state.token}` });
});

document.getElementById('testAdminDashboardBtn')?.addEventListener('click', () => {
  testEndpoint('/api/protected/admin-dashboard', { 'Authorization': `Bearer ${state.token}` });
});

document.getElementById('testHealthBtn')?.addEventListener('click', () => {
  testEndpoint('/api/health');
});

// ---------------------------------------------------------
// 5. EventEmitter Audit Log
// ---------------------------------------------------------
async function loadEvents() {
  const container = document.getElementById('eventsLogContainer');
  if (!state.token) {
    container.innerHTML = '<p class="placeholder-text">Authentication required to view system event logs. Please log in first.</p>';
    return;
  }

  try {
    const res = await fetch('/api/protected/events', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    if (data.events.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No events logged yet.</p>';
      return;
    }

    container.innerHTML = data.events.map(ev => {
      const cleanClass = ev.event.replace(':', '-');
      return `
        <div class="event-entry ${cleanClass}">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="color:var(--text-primary);">${escapeHtml(ev.event)}</strong>
            <span style="color:var(--text-muted); font-size:0.72rem;">${escapeHtml(ev.timestamp)}</span>
          </div>
          <div>${escapeHtml(JSON.stringify(ev.payload))}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444;">Error fetching events: ${escapeHtml(err.message)}</p>`;
  }
}

document.getElementById('refreshEventsBtn')?.addEventListener('click', loadEvents);

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Initial Bootstrap
updateAuthStateUI();
initSocketConnection();

// Support direct hash tab switching (e.g. #notes, #chat, #rbac, #events)
if (window.location.hash) {
  const tabName = window.location.hash.replace('#', '');
  const tabBtn = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  if (tabBtn) tabBtn.click();
}

