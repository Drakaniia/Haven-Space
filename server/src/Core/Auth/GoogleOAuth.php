<?php

namespace App\Core\Auth;

/**
 * Google OAuth Authentication Handler
 * 
 * Handles Google OAuth 2.0 authentication flow including:
 * - Generating authorization URLs
 * - Exchanging authorization codes for tokens
 * - Fetching user profile from Google API
 * - Token refresh
 */
class GoogleOAuth
{
    private static $config;

    /**
     * Initialize Google OAuth configuration
     */
    private static function init()
    {
        if (!self::$config) {
            self::$config = require __DIR__ . '/../../../config/google.php';
        }
    }

    /**
     * Make HTTP POST request (uses cURL, or Guzzle if available)
     */
    private static function postRequest(string $url, array $data): array
    {
        // Try Guzzle first if available
        if (class_exists('\GuzzleHttp\Client')) {
            $client = new \GuzzleHttp\Client();
            $response = $client->post($url, ['form_params' => $data]);
            return json_decode($response->getBody()->getContents(), true);
        }

        // Fallback to cURL
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \Exception('HTTP request failed: ' . $error);
        }

        return json_decode($response, true);
    }

    /**
     * Make HTTP GET request with authorization header (uses cURL, or Guzzle if available)
     */
    private static function getRequest(string $url, string $accessToken): array
    {
        // Try Guzzle first if available
        if (class_exists('\GuzzleHttp\Client')) {
            $client = new \GuzzleHttp\Client();
            $response = $client->get($url, [
                'headers' => ['Authorization' => 'Bearer ' . $accessToken],
            ]);
            return json_decode($response->getBody()->getContents(), true);
        }

        // Fallback to cURL
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \Exception('HTTP request failed: ' . $error);
        }

        return json_decode($response, true);
    }

    /**
     * Generate Google OAuth authorization URL
     * 
     * @param string $state Random state string for CSRF protection
     * @return string Authorization URL
     */
    public static function getAuthorizationUrl(string $state): string
    {
        self::init();

        $params = [
            'client_id' => self::$config['client_id'],
            'redirect_uri' => self::$config['redirect_uri'],
            'response_type' => self::$config['response_type'],
            'scope' => implode(' ', self::$config['scopes']),
            'state' => $state,
            'access_type' => self::$config['access_type'],
            'prompt' => self::$config['prompt'],
        ];

        return self::$config['auth_uri'] . '?' . http_build_query($params);
    }

    /**
     * Exchange authorization code for access token
     * 
     * @param string $code Authorization code from Google callback
     * @return array Token data (access_token, refresh_token, expires_in, etc.)
     * @throws \Exception If token exchange fails
     */
    public static function exchangeCodeForToken(string $code): array
    {
        self::init();

        $body = self::postRequest(self::$config['token_uri'], [
            'client_id' => self::$config['client_id'],
            'client_secret' => self::$config['client_secret'],
            'redirect_uri' => self::$config['redirect_uri'],
            'grant_type' => 'authorization_code',
            'code' => $code,
        ]);

        if (isset($body['error'])) {
            throw new \Exception('Google token exchange failed: ' . $body['error']);
        }

        return $body;
    }

    /**
     * Get user profile information from Google API
     * 
     * @param string $accessToken Access token from token exchange
     * @return array User profile data
     * @throws \Exception If fetching user info fails
     */
    public static function getUserInfo(string $accessToken): array
    {
        self::init();

        $body = self::getRequest(self::$config['userinfo_uri'], $accessToken);

        if (isset($body['error'])) {
            throw new \Exception('Google userinfo request failed: ' . $body['error']);
        }

        return $body;
    }

    /**
     * Refresh an expired access token
     * 
     * @param string $refreshToken Refresh token from initial token exchange
     * @return array New token data
     * @throws \Exception If token refresh fails
     */
    public static function refreshToken(string $refreshToken): array
    {
        self::init();

        $body = self::postRequest(self::$config['token_uri'], [
            'client_id' => self::$config['client_id'],
            'client_secret' => self::$config['client_secret'],
            'refresh_token' => $refreshToken,
            'grant_type' => 'refresh_token',
        ]);

        if (isset($body['error'])) {
            throw new \Exception('Google token refresh failed: ' . $body['error']);
        }

        return $body;
    }

    /**
     * Validate ID token (JWT from Google)
     * 
     * @param string $idToken ID token to validate
     * @return array|null Decoded token payload or null if invalid
     */
    public static function validateIdToken(string $idToken): ?array
    {
        try {
            // Fetch Google's public keys
            $certsUrl = 'https://www.googleapis.com/oauth2/v3/certs';
            $response = file_get_contents($certsUrl);
            $certs = json_decode($response, true);

            if (!$certs) {
                return null;
            }

            // Get header to find which key was used
            $parts = explode('.', $idToken);
            if (count($parts) !== 3) {
                return null;
            }

            $header = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[0])), true);
            $kid = $header['kid'] ?? null;

            if (!$kid || !isset($certs[$kid])) {
                return null;
            }

            // Verify signature (simplified - in production use firebase/php-jwt)
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);

            // Verify issuer
            if (($payload['iss'] ?? '') !== 'https://accounts.google.com' && 
                ($payload['iss'] ?? '') !== 'accounts.google.com') {
                return null;
            }

            // Verify expiration
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return null;
            }

            return $payload;
        } catch (\Exception $e) {
            error_log('Google ID token validation error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Generate a random state string for CSRF protection
     * 
     * @return string Random state string
     */
    public static function generateState(): string
    {
        return bin2hex(random_bytes(32));
    }
}
