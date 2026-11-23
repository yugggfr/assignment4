const m = require('mongoose');
const { dbState, fileStore } = require('../config/db');

// --- 1. Mongoose Schema Definition ---
const noteSchema = new m.Schema({
  title: {
    type: String,
    required: [true, 'Note title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Note content is required']
  },
  tags: {
    type: [String],
    default: []
  },
  userId: {
    type: m.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Note must belong to a user']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

let MongoNoteModel;
try {
  MongoNoteModel = m.model('Note');
} catch {
  MongoNoteModel = m.model('Note', noteSchema);
}

// --- 2. Unified Interface for MongoDB and Local JSON Persistence ---
const Note = {
  async create({ title, content, tags = [], userId }) {
    if (dbState.isMongo) {
      const doc = await MongoNoteModel.create({
        title,
        content,
        tags: Array.isArray(tags) ? tags : [tags],
        userId
      });
      return {
        id: doc._id.toString(),
        _id: doc._id.toString(),
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
        userId: doc.userId.toString(),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };
    } else {
      const data = fileStore.readData();
      const id = 'note_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
      const newNote = {
        id,
        _id: id,
        title,
        content,
        tags: Array.isArray(tags) ? tags : [tags],
        userId: userId.toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      data.notes.push(newNote);
      fileStore.writeData(data);
      return { ...newNote };
    }
  },

  async findByUserId(userId) {
    if (dbState.isMongo) {
      const docs = await MongoNoteModel.find({ userId }).sort({ createdAt: -1 });
      return docs.map(doc => ({
        id: doc._id.toString(),
        _id: doc._id.toString(),
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
        userId: doc.userId.toString(),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }));
    } else {
      const data = fileStore.readData();
      return data.notes
        .filter(n => n.userId === userId.toString())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },

  async findById(id) {
    if (dbState.isMongo) {
      const doc = await MongoNoteModel.findById(id);
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        _id: doc._id.toString(),
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
        userId: doc.userId.toString(),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };
    } else {
      const data = fileStore.readData();
      const note = data.notes.find(n => n.id === id || n._id === id);
      return note ? { ...note } : null;
    }
  },

  async update(id, userId, { title, content, tags }) {
    if (dbState.isMongo) {
      const doc = await MongoNoteModel.findOne({ _id: id, userId });
      if (!doc) return null;

      if (title !== undefined) doc.title = title;
      if (content !== undefined) doc.content = content;
      if (tags !== undefined) doc.tags = Array.isArray(tags) ? tags : [tags];
      doc.updatedAt = new Date();

      await doc.save();
      return {
        id: doc._id.toString(),
        _id: doc._id.toString(),
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
        userId: doc.userId.toString(),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };
    } else {
      const data = fileStore.readData();
      const index = data.notes.findIndex(n => (n.id === id || n._id === id) && n.userId === userId.toString());
      if (index === -1) return null;

      if (title !== undefined) data.notes[index].title = title;
      if (content !== undefined) data.notes[index].content = content;
      if (tags !== undefined) data.notes[index].tags = Array.isArray(tags) ? tags : [tags];
      data.notes[index].updatedAt = new Date().toISOString();

      fileStore.writeData(data);
      return { ...data.notes[index] };
    }
  },

  async delete(id, userId) {
    if (dbState.isMongo) {
      const result = await MongoNoteModel.findOneAndDelete({ _id: id, userId });
      return !!result;
    } else {
      const data = fileStore.readData();
      const initialLength = data.notes.length;
      data.notes = data.notes.filter(n => !( (n.id === id || n._id === id) && n.userId === userId.toString() ));
      if (data.notes.length !== initialLength) {
        fileStore.writeData(data);
        return true;
      }
      return false;
    }
  },

  async countTotal() {
    if (dbState.isMongo) {
      return MongoNoteModel.countDocuments();
    } else {
      const data = fileStore.readData();
      return data.notes.length;
    }
  }
};

module.exports = Note;
