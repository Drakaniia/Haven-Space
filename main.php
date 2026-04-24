<?php

require_once __DIR__ . '/functions/havenspace-api/vendor/autoload.php';

return function ($context) {
    $req = $context->req;
    $res = $context->res;

    // Inject env vars from function environment
    $_ENV['APPWRITE_ENDPOINT']    = $context->env['APPWRITE_FUNCTION_ENDPOINT'] ?? '';
    $_ENV['APPWRITE_PROJECT_ID']  = $context->env['APPWRITE_FUNCTION_PROJECT_ID'] ?? '';
    $_ENV['APPWRITE_API_KEY']     = $context->env['APPWRITE_FUNCTION_API_KEY'] ?? '';
    $_ENV['APPWRITE_DATABASE_ID'] = $context->env['APPWRITE_DATABASE_ID'] ?? '';
    $_ENV['APP_ENV']              = $context->env['APP_ENV'] ?? 'production';
    $_ENV['JWT_SECRET']           = $context->env['JWT_SECRET'] ?? '';
    $_ENV['GROQ_API_KEY']         = $context->env['GROQ_API_KEY'] ?? '';
    $_ENV['GROQ_BASE_URL']        = $context->env['GROQ_BASE_URL'] ?? '';
    $_ENV['GROQ_DEFAULT_MODEL']   = $context->env['GROQ_DEFAULT_MODEL'] ?? '';

    $existingOrigins = $context->env['ALLOWED_ORIGINS'] ?? '';
    $productionOrigin = 'https://haven-space.appwrite.network';
    if (strpos($existingOrigins, $productionOrigin) === false) {
        $existingOrigins = $existingOrigins ? $existingOrigins . ',' . $productionOrigin : $productionOrigin;
    }
    $_ENV['ALLOWED_ORIGINS'] = $existingOrigins;

    foreach ($_ENV as $key => $value) {
        putenv("$key=$value");
    }

    // Fake superglobals that routes.php / middleware rely on
    $_SERVER['REQUEST_METHOD']     = $req->method;
    $_SERVER['REQUEST_URI']        = $req->path;
    $_SERVER['HTTP_AUTHORIZATION'] = $req->headers['authorization'] ?? '';
    $_SERVER['HTTP_ORIGIN']        = $req->headers['origin'] ?? 'https://haven-space.appwrite.network';
    $_SERVER['SERVER_SOFTWARE']    = 'Appwrite-Function';
    $_GET  = $req->query ?? [];
    $_POST = (array) json_decode($req->body ?? '{}', true);

    // Handle CORS preflight
    if ($req->method === 'OPTIONS') {
        return $res->text('', 204, [
            'Access-Control-Allow-Origin'  => 'https://haven-space.appwrite.network',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials' => 'true',
            'Access-Control-Max-Age' => '86400',
        ]);
    }

    // Capture output — routes.php echoes JSON directly
    // header() calls inside routes.php are no-ops in this context (already sent by Appwrite)
    ob_start();
    $statusCode = 200;

    try {
        require_once __DIR__ . '/server/api/routes.php';
    } catch (\Throwable $e) {
        ob_end_clean();
        return $res->text(json_encode([
            'error' => 'Internal server error',
            'message' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
        ]), 500, [
            'Content-Type' => 'application/json',
            'Access-Control-Allow-Origin' => 'https://haven-space.appwrite.network',
        ]);
    }

    $output = ob_get_clean();

    // Detect HTTP status from http_response_code() calls inside routes
    $detectedStatus = http_response_code();
    if ($detectedStatus && $detectedStatus !== 200) {
        $statusCode = $detectedStatus;
    }

    return $res->text($output ?: '{}', $statusCode, [
        'Access-Control-Allow-Origin'      => 'https://haven-space.appwrite.network',
        'Access-Control-Allow-Methods'     => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers'     => 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials' => 'true',
        'Content-Type'                     => 'application/json',
    ]);
};

