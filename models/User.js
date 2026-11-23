const bcrypt = require('bcryptjs');
const mongoose = require('crypto'); // used for fallback UUID
const m = require('mongoose');
const { dbState, fileStore } = require('../config/db');

// --- 1. Mongoose Schema Definition (Used when MongoDB is available) ---
const userSchema = new m.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

let MongoUserModel;
try {
  MongoUserModel = m.model('User');
} catch {
  MongoUserModel = m.model('User', userSchema);
}

// --- 2. Unified Interface for MongoDB and Local JSON Persistence ---
const User = {
  // Password hashing utility using bcrypt
  async hashPassword(plainPassword) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plainPassword, salt);
  },

  // Password comparison utility
  async comparePassword(candidatePassword, hashedPassword) {
    return bcrypt.compare(candidatePassword, hashedPassword);
  },

  async create({ username, email, password, role = 'user' }) {
    const hashedPassword = await this.hashPassword(password);

    if (dbState.isMongo) {
      const doc = await MongoUserModel.create({
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        role
      });
      return {
        id: doc._id.toString(),
        _id: doc._id.toString(),
        username: doc.username,
        email: doc.email,
        role: doc.role,
        createdAt: doc.createdAt
      };
    } else {
      const data = fileStore.readData();
      const existingEmail = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingEmail) {
        const error = new Error('Email is already registered');
        error.code = 11000;
        throw error;
      }
      const existingUser = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existingUser) {
        const error = new Error('Username is already taken');
        error.code = 11000;
        throw error;
      }

      const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
      const newUser = {
        id,
        _id: id,
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        createdAt: new Date().toISOString()
      };
      data.users.push(newUser);
      fileStore.writeData(data);
      return {
        id: newUser.id,
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      };
    }
  },

  async findOne(query) {
    if (dbState.isMongo) {
      const doc = await MongoUserModel.findOne(query);
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        _id: doc._id.toString(),
        username: doc.username,
        email: doc.email,
        password: doc.password,
        role: doc.role,
        createdAt: doc.createdAt
      };
    } else {
      const data = fileStore.readData();
      const user = data.users.find(u => {
        let match = true;
        if (query.email && u.email.toLowerCase() !== query.email.toLowerCase()) match = false;
        if (query.username && u.username.toLowerCase() !== query.username.toLowerCase()) match = false;
        if (query.id && u.id !== query.id && u._id !== query.id) match = false;
        if (query._id && u.id !== query._id && u._id !== query._id) match = false;
        return match;
      });
      return user ? { ...user } : null;
    }
  },

  async findById(id) {
    if (dbState.isMongo) {
      const doc = await MongoUserModel.findById(id);
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        _id: doc._id.toString(),
        username: doc.username,
        email: doc.email,
        password: doc.password,
        role: doc.role,
        createdAt: doc.createdAt
      };
    } else {
      const data = fileStore.readData();
      const user = data.users.find(u => u.id === id || u._id === id);
      return user ? { ...user } : null;
    }
  },

  async findAll() {
    if (dbState.isMongo) {
      const docs = await MongoUserModel.find().select('-password');
      return docs.map(doc => ({
        id: doc._id.toString(),
        _id: doc._id.toString(),
        username: doc.username,
        email: doc.email,
        role: doc.role,
        createdAt: doc.createdAt
      }));
    } else {
      const data = fileStore.readData();
      return data.users.map(u => ({
        id: u.id,
        _id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt
      }));
    }
  }
};

module.exports = User;
