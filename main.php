<?php

// App\ namespace (controllers, services, middleware, etc.)
require_once __DIR__ . '/functions/vendor/autoload.php';
// Appwrite SDK
require_once __DIR__ . '/functions/api/vendor/autoload.php';

return function ($context) {
    $req = $context->req;
    $res = $context->res;

    // Signal to bootstrap/cors/middleware that we're inside an Appwrite function
    if (!defined('APPWRITE_FUNCTION_CONTEXT')) {
        define('APPWRITE_FUNCTION_CONTEXT', true);
    }

    // Suppress header() / http_response_code() warnings — Swoole manages headers
    set_error_handler(function (int $errno, string $errstr) {
        if (stripos($errstr, 'header') !== false) {
            return true;
        }
        return false;
    }, E_WARNING | E_NOTICE);

    // ----------------------------------------------------------------
    // Populate $_ENV / putenv from Appwrite function environment vars
    // ----------------------------------------------------------------
    $envMap = [
        'APPWRITE_ENDPOINT'    => 'APPWRITE_FUNCTION_ENDPOINT',
        'APPWRITE_PROJECT_ID'  => 'APPWRITE_FUNCTION_PROJECT_ID',
        'APPWRITE_API_KEY'     => 'APPWRITE_FUNCTION_API_KEY',
        'APPWRITE_DATABASE_ID' => 'APPWRITE_DATABASE_ID',
        'APP_ENV'              => 'APP_ENV',
        'JWT_SECRET'           => 'JWT_SECRET',
        'GROQ_API_KEY'         => 'GROQ_API_KEY',
        'GROQ_BASE_URL'        => 'GROQ_BASE_URL',
        'GROQ_DEFAULT_MODEL'   => 'GROQ_DEFAULT_MODEL',
        'DB_HOST'              => 'DB_HOST',
        'DB_PORT'              => 'DB_PORT',
        'DB_NAME'              => 'DB_NAME',
        'DB_USER'              => 'DB_USER',
        'DB_PASS'              => 'DB_PASS',
    ];

    $defaults = [
        'APP_ENV'  => 'production',
    ];

    foreach ($envMap as $envKey => $contextKey) {
        $value = $context->env[$contextKey] ?? $defaults[$envKey] ?? '';
        $_ENV[$envKey] = $value;
        putenv("$envKey=$value");
    }

    // Ensure production origin is always in ALLOWED_ORIGINS
    $productionOrigin = 'https://haven-space.appwrite.network';
    $existingOrigins  = $context->env['ALLOWED_ORIGINS'] ?? '';
    if (strpos($existingOrigins, $productionOrigin) === false) {
        $existingOrigins = $existingOrigins ? $existingOrigins . ',' . $productionOrigin : $productionOrigin;
    }
    $_ENV['ALLOWED_ORIGINS'] = $existingOrigins;
    putenv("ALLOWED_ORIGINS=$existingOrigins");

    // ----------------------------------------------------------------
    // Populate superglobals so routes.php / middleware work identically
    // to the localhost PHP built-in server
    // ----------------------------------------------------------------
    $origin = $req->headers['origin'] ?? $req->headers['Origin'] ?? $productionOrigin;

    $_SERVER['REQUEST_METHOD']       = $req->method;
    $_SERVER['REQUEST_URI']          = $req->path . (!empty($req->query) ? '?' . http_build_query($req->query) : '');
    $_SERVER['HTTP_AUTHORIZATION']   = $req->headers['authorization'] ?? $req->headers['Authorization'] ?? '';
    $_SERVER['HTTP_ORIGIN']          = $origin;
    $_SERVER['HTTP_X_USER_ID']       = $req->headers['x-user-id'] ?? '';
    $_SERVER['HTTP_X_SESSION_ID']    = $req->headers['x-session-id'] ?? '';
    $_SERVER['HTTP_CONTENT_TYPE']    = $req->headers['content-type'] ?? 'application/json';
    $_SERVER['CONTENT_TYPE']         = $req->headers['content-type'] ?? 'application/json';
    $_SERVER['SERVER_SOFTWARE']      = 'Appwrite-Function';
    $_SERVER['SERVER_NAME']          = 'haven-space.appwrite.network';
    $_SERVER['HTTPS']                = 'on';

    // Query string parameters
    $_GET = $req->query ?? [];

    // Body — parse JSON into $_POST so file-based endpoints can use it
    $rawBody = $req->body ?? '';
    $parsed  = json_decode($rawBody, true);
    $_POST   = is_array($parsed) ? $parsed : [];

    // Make raw body available for endpoints that read php://input
    $GLOBALS['_RAW_BODY'] = $rawBody;

    // ----------------------------------------------------------------
    // CORS preflight — short-circuit before any routing
    // ----------------------------------------------------------------
    $corsHeaders = [
        'Access-Control-Allow-Origin'      => $origin,
        'Access-Control-Allow-Methods'     => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers'     => 'Content-Type, Authorization, X-Requested-With, X-User-Id, X-Session-Id',
        'Access-Control-Allow-Credentials' => 'true',
        'Access-Control-Max-Age'           => '86400',
        'Content-Type'                     => 'application/json',
    ];

    if ($req->method === 'OPTIONS') {
        return $res->text('', 204, $corsHeaders);
    }

    // ----------------------------------------------------------------
    // Delegate to routes.php — same file the local server uses
    // ----------------------------------------------------------------
    ob_start();
    $statusCode = 200;

    try {
        require_once __DIR__ . '/functions/api/routes.php';
    } catch (ResponseSentException $e) {
        $statusCode = $e->statusCode;
    } catch (\Throwable $e) {
        ob_end_clean();
        return $res->text(json_encode([
            'error'   => 'Internal server error',
            'message' => $e->getMessage(),
            'file'    => basename($e->getFile()),
            'line'    => $e->getLine(),
        ]), 500, $corsHeaders);
    }

    $output = ob_get_clean();

    // Honour status codes set via http_response_code() inside route handlers
    $detectedStatus = http_response_code();
    if ($detectedStatus && $detectedStatus !== 200 && $statusCode === 200) {
        $statusCode = $detectedStatus;
    }

    return $res->text($output ?: '{}', $statusCode, $corsHeaders);
};


