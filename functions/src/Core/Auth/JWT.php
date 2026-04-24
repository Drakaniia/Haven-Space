<?php

namespace App\Core\Auth;

class JWT
{
    private static $secret;
    private static $expiration;

    private static function init()
    {
        $config = require __DIR__ . '/../../../config/app.php';
        self::$secret = $config['jwt_secret'];
        self::$expiration = $config['jwt_expiration'];
    }

    public static function generate(array $payload, int $expiration = null): string
    {
        self::init();
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + ($expiration ?? self::$expiration);
        $payload = json_encode($payload);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function validate(string $token): ?array
    {
        self::init();
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        list($header, $payload, $signature) = $parts;

        $validSignature = hash_hmac('sha256', $header . "." . $payload, self::$secret, true);
        $base64UrlValidSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));

        if ($signature !== $base64UrlValidSignature) return null;

        $payloadData = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        if ($payloadData['exp'] < time()) return null;

        return $payloadData;
    }

    /**
     * Set authentication cookies with environment-aware settings
     * 
     * @param string $accessToken The JWT access token
     * @param string $refreshToken The JWT refresh token
     * @param array $config Application configuration
     */
    public static function setAuthCookies(string $accessToken, string $refreshToken, array $config): void
    {
        // Determine cookie settings based on environment
        $isProduction = function_exists('isProduction') ? isProduction() : false;
        
        if ($isProduction) {
            $secure = true;
            $sameSite = 'Lax';
        } else {
            // Development: SameSite=None requires Secure=true (browsers reject None without Secure).
            // Use Lax instead — works for same-host cross-port (localhost:80 ↔ localhost:8000).
            $secure = false;
            $sameSite = 'Lax';
        }
        
        // Set access token cookie
        setcookie('access_token', $accessToken, [
            'expires' => time() + $config['jwt_expiration'],
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $sameSite
        ]);

        // Set refresh token cookie
        setcookie('refresh_token', $refreshToken, [
            'expires' => time() + $config['refresh_token_expiration'],
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $sameSite
        ]);
    }

    /**
     * Clear authentication cookies
     */
    public static function clearAuthCookies(): void
    {
        $isProduction = function_exists('isProduction') ? isProduction() : false;
        
        if ($isProduction) {
            $secure = true;
            $sameSite = 'Lax';
        } else {
            $secure = false;
            $sameSite = 'Lax';
        }
        
        // Clear access token
        setcookie('access_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $sameSite
        ]);

        // Clear refresh token
        setcookie('refresh_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $sameSite
        ]);
    }
}
