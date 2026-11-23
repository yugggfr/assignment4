const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}

// Create a single shared event bus instance
const eventBus = new AppEventEmitter();

// In-memory event audit log for demonstration and tracking
const eventLogs = [];
const MAX_LOGS = 100;

function logEvent(type, payload) {
  const logEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    event: type,
    payload
  };
  eventLogs.unshift(logEntry);
  if (eventLogs.length > MAX_LOGS) {
    eventLogs.pop();
  }
  return logEntry;
}

// 1. User events
eventBus.on('user:signup', (user) => {
  const entry = logEvent('user:signup', { userId: user.id || user._id, username: user.username, role: user.role, email: user.email });
  console.log(`[EVENT: user:signup] [${entry.timestamp}] User signed up: ${user.username} (${user.email}) - Role: ${user.role}`);
});

eventBus.on('user:login', (user) => {
  const entry = logEvent('user:login', { userId: user.id || user._id, username: user.username, role: user.role });
  console.log(`[EVENT: user:login] [${entry.timestamp}] User logged in: ${user.username} (ID: ${user.id || user._id})`);
});

eventBus.on('user:login_failed', (data) => {
  const entry = logEvent('user:login_failed', data);
  console.warn(`[EVENT: user:login_failed] [${entry.timestamp}] Failed login attempt for email: ${data.email} - Reason: ${data.reason}`);
});

// 2. Note CRUD events
eventBus.on('note:created', (data) => {
  const entry = logEvent('note:created', data);
  console.log(`[EVENT: note:created] [${entry.timestamp}] Note created: "${data.title}" (ID: ${data.id}) by User: ${data.username || data.userId}`);
});

eventBus.on('note:updated', (data) => {
  const entry = logEvent('note:updated', data);
  console.log(`[EVENT: note:updated] [${entry.timestamp}] Note updated: ID: ${data.id} by User: ${data.username || data.userId}`);
});

eventBus.on('note:deleted', (data) => {
  const entry = logEvent('note:deleted', data);
  console.log(`[EVENT: note:deleted] [${entry.timestamp}] Note deleted: ID: ${data.id} by User: ${data.username || data.userId}`);
});

// 3. Chat events
eventBus.on('chat:message', (data) => {
  const entry = logEvent('chat:message', data);
  console.log(`[EVENT: chat:message] [${entry.timestamp}] Chat message in #${data.room} from ${data.username}: "${data.message}"`);
});

eventBus.on('chat:user_connected', (data) => {
  const entry = logEvent('chat:user_connected', data);
  console.log(`[EVENT: chat:user_connected] [${entry.timestamp}] User connected to Socket: ${data.username} (Socket: ${data.socketId})`);
});

eventBus.on('chat:user_disconnected', (data) => {
  const entry = logEvent('chat:user_disconnected', data);
  console.log(`[EVENT: chat:user_disconnected] [${entry.timestamp}] User disconnected: ${data.username} (Socket: ${data.socketId})`);
});

// 4. Security & RBAC events
eventBus.on('security:unauthorized', (data) => {
  const entry = logEvent('security:unauthorized', data);
  console.warn(`[EVENT: security:unauthorized] [${entry.timestamp}] Unauthorized access attempt to ${data.path} from IP: ${data.ip}`);
});

eventBus.on('security:forbidden_role', (data) => {
  const entry = logEvent('security:forbidden_role', data);
  console.warn(`[EVENT: security:forbidden_role] [${entry.timestamp}] Forbidden role access to ${data.path} by user ${data.username} with role ${data.role}`);
});

module.exports = {
  eventBus,
  eventLogs
};
