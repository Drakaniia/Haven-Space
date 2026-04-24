<?php
/**
 * Google OAuth Configuration
 * 
 * Configure your Google Cloud Console credentials here:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create or select a project
 * 3. Enable Google+ API
 * 4. Create OAuth 2.0 credentials
 * 5. Set authorized redirect URI to match GOOGLE_REDIRECT_URI in .env
 */

return [
    'client_id' => $_ENV['GOOGLE_CLIENT_ID'] ?? getenv('GOOGLE_CLIENT_ID') ?? '',
    'client_secret' => $_ENV['GOOGLE_CLIENT_SECRET'] ?? getenv('GOOGLE_CLIENT_SECRET') ?? '',
    'redirect_uri' => $_ENV['GOOGLE_REDIRECT_URI'] ?? getenv('GOOGLE_REDIRECT_URI') ?? '',
    
    // OAuth scopes - what information we're requesting from Google
    'scopes' => [
        'openid',     // Basic OpenID Connect
        'email',      // User's email address
        'profile',    // Basic profile information (name, picture, etc.)
    ],
    
    // Google OAuth endpoints
    'auth_uri' => 'https://accounts.google.com/o/oauth2/v2/auth',
    'token_uri' => 'https://oauth2.googleapis.com/token',
    'userinfo_uri' => 'https://www.googleapis.com/oauth2/v3/userinfo',
    
    // OAuth response type
    'response_type' => 'code',
    
    // Access type (offline = refresh token)
    'access_type' => 'offline',
    
    // Prompt for consent every time (to ensure we get refresh token)
    'prompt' => 'consent',
];
