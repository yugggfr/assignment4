const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const dbState = {
  isMongo: false,
  connected: false
};

function ensureFileStore() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], notes: [] }, null, 2));
  }
}

function readData() {
  ensureFileStore();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { users: [], notes: [] };
  }
}

function writeData(data) {
  ensureFileStore();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const fileStore = {
  readData,
  writeData,
  DB_PATH
};

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/secure_connect_db';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000
    });
    dbState.isMongo = true;
    dbState.connected = true;
    console.log(`[Database] Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    dbState.isMongo = false;
    dbState.connected = true;
    ensureFileStore();
    console.log('[Database] MongoDB connection skipped/unavailable.');
    console.log(`[Database] Active Data Persistence: Local JSON File Store (${DB_PATH})`);
  }
}

module.exports = {
  connectDB,
  dbState,
  fileStore
};
