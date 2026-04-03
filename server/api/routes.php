<?php

/**
 * API Routes
 * Defines all API endpoints for the application
 */

// TODO: Initialize router and middleware

// ============================================
// MESSAGE ROUTES
// ============================================
// TODO: Initialize MessageController

// Get all conversations for current user
// GET /api/messages/conversations
// Route::get('/api/messages/conversations', [MessageController::class, 'index']);

// Get specific conversation with messages
// GET /api/messages/conversations/{id}
// Route::get('/api/messages/conversations/{id}', [MessageController::class, 'show']);

// Send a new message
// POST /api/messages
// Route::post('/api/messages', [MessageController::class, 'store']);

// Mark messages as read
// PUT /api/messages/conversations/{id}/read
// Route::put('/api/messages/conversations/{id}/read', [MessageController::class, 'markAsRead']);

// Search messages
// GET /api/messages/search?q={query}
// Route::get('/api/messages/search', [MessageController::class, 'search']);

// Download message attachment
// GET /api/messages/attachments/{id}/download
// Route::get('/api/messages/attachments/{id}/download', [MessageController::class, 'downloadAttachment']);

// Delete a message
// DELETE /api/messages/{id}
// Route::delete('/api/messages/{id}', [MessageController::class, 'destroy']);

// TODO: Add authentication middleware to all message routes
// TODO: Add rate limiting middleware
// TODO: Add request validation middleware

// ============================================
// OTHER ROUTES WILL BE ADDED HERE
// ============================================

// TODO: Add user authentication routes
// TODO: Add property management routes
// TODO: Add booking routes
// TODO: Add payment routes
// TODO: Add maintenance routes
// TODO: Add application routes
