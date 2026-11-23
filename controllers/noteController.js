const Note = require('../models/Note');
const { eventBus } = require('../events/eventBus');

/**
 * @route   POST /api/notes
 * @desc    Create a new personal note
 * @access  Private (Authenticated)
 */
async function createNote(req, res, next) {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both title and content for the note.'
      });
    }

    const note = await Note.create({
      title: title.trim(),
      content: content.trim(),
      tags: tags || [],
      userId: req.user.id
    });

    eventBus.emit('note:created', {
      id: note.id || note._id,
      title: note.title,
      userId: req.user.id,
      username: req.user.username
    });

    res.status(201).json({
      success: true,
      message: 'Note created successfully.',
      note
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /api/notes
 * @desc    Get all notes for current authenticated user
 * @access  Private (Authenticated)
 */
async function getNotes(req, res, next) {
  try {
    const notes = await Note.findByUserId(req.user.id);

    res.status(200).json({
      success: true,
      count: notes.length,
      notes
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /api/notes/:id
 * @desc    Get single note by ID (ownership verified)
 * @access  Private (Authenticated)
 */
async function getNoteById(req, res, next) {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.'
      });
    }

    // Authorization check: note must belong to logged-in user unless admin
    if (note.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. You do not have permission to view this note.'
      });
    }

    res.status(200).json({
      success: true,
      note
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   PUT /api/notes/:id
 * @desc    Update an existing note (ownership verified)
 * @access  Private (Authenticated)
 */
async function updateNote(req, res, next) {
  try {
    const { title, content, tags } = req.body;

    const existingNote = await Note.findById(req.params.id);
    if (!existingNote) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.'
      });
    }

    // Ownership check
    if (existingNote.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. You cannot update notes belonging to other users.'
      });
    }

    const updatedNote = await Note.update(req.params.id, existingNote.userId, {
      title,
      content,
      tags
    });

    eventBus.emit('note:updated', {
      id: updatedNote.id || updatedNote._id,
      title: updatedNote.title,
      userId: req.user.id,
      username: req.user.username
    });

    res.status(200).json({
      success: true,
      message: 'Note updated successfully.',
      note: updatedNote
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete an existing note (ownership verified)
 * @access  Private (Authenticated)
 */
async function deleteNote(req, res, next) {
  try {
    const existingNote = await Note.findById(req.params.id);
    if (!existingNote) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.'
      });
    }

    // Ownership check
    if (existingNote.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. You cannot delete notes belonging to other users.'
      });
    }

    await Note.delete(req.params.id, existingNote.userId);

    eventBus.emit('note:deleted', {
      id: req.params.id,
      userId: req.user.id,
      username: req.user.username
    });

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote
};
