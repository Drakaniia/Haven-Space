<?php

require_once __DIR__ . '/../cors.php';

header('Content-Type: application/json');

// Capture everything about the request
$debug = [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'headers' => getallheaders(),
    'remote_addr' => $_SERVER['REMOTE_ADDR'],
    'http_origin' => $_SERVER['HTTP_ORIGIN'] ?? 'none',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
    'raw_input' => file_get_contents('php://input'),
    'parsed_json' => json_decode(file_get_contents('php://input'), true),
    'post' => $_POST,
    'get' => $_GET,
    'cookies' => $_COOKIE,
];

echo json_encode($debug, JSON_PRETTY_PRINT);
