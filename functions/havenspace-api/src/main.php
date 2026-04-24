<?php

require_once __DIR__ . '/../vendor/autoload.php';

return function ($context) {
    $req = $context->req;
    $res = $context->res;

    // Write env vars so bootstrap.php / Env::load() can pick them up
    // The function container won't have server/.env, so we inject from function env vars
    $_ENV['APPWRITE_ENDPOINT']    = $context->env['APPWRITE_FUNCTION_ENDPOINT'] ?? '';
    $_ENV['APPWRITE_PROJECT_ID']  = $context->env['APPWRITE_FUNCTION_PROJECT_ID'] ?? '';
    $_ENV['APPWRITE_API_KEY']     = $context->env['APPWRITE_FUNCTION_API_KEY'] ?? '';
    $_ENV['APPWRITE_DATABASE_ID'] = $context->env['APPWRITE_DATABASE_ID'] ?? '';
    $_ENV['APP_ENV']              = $context->env['APP_ENV'] ?? 'production';
    $_ENV['JWT_SECRET']           = $context->env['JWT_SECRET'] ?? '';
    $_ENV['GROQ_API_KEY']         = $context->env['GROQ_API_KEY'] ?? '';
    $_ENV['GROQ_BASE_URL']        = $context->env['GROQ_BASE_URL'] ?? '';
    $_ENV['GROQ_DEFAULT_MODEL']   = $context->env['GROQ_DEFAULT_MODEL'] ?? '';

    // Also set via putenv so getenv() calls work too
    foreach ($_ENV as $key => $value) {
        putenv("$key=$value");
    }

    // Fake superglobals that routes.php / middleware rely on
    $_SERVER['REQUEST_METHOD']    = $req->method;
    $_SERVER['REQUEST_URI']       = $req->path;
    $_SERVER['HTTP_AUTHORIZATION'] = $req->headers['authorization'] ?? '';
    $_GET  = $req->query ?? [];
    $_POST = (array) json_decode($req->body ?? '{}', true);

    // Handle CORS preflight
    if ($req->method === 'OPTIONS') {
        return $res->setHeaders([
            'Access-Control-Allow-Origin'  => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization',
        ])->send('', 204);
    }

    // Buffer output — routes.php echoes JSON directly
    ob_start();
    // server/ is copied into the function root at deploy time
    require_once __DIR__ . '/../server/api/routes.php';
    $output = ob_get_clean();

    return $res->setHeaders([
        'Access-Control-Allow-Origin' => '*',
        'Content-Type'                => 'application/json',
    ])->send($output, 200);
};
