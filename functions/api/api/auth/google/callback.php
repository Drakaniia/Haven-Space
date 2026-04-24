<?php
/**
 * Backward compatibility redirect for old Google OAuth redirect_uri
 *
 * Old redirect_uri: /api/auth/google/callback.php
 * New redirect_uri: /api/auth/google/callback.php (direct)
 *
 * This file now directly requires the actual callback handler.
 */

require_once __DIR__ . '/../../../auth/google/callback.php';
