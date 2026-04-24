<?php

/**
 * Admin Settings API
 * GET /api/admin/settings.php
 * PATCH /api/admin/settings.php {settings: {...}}
 *
 * Manages system-wide settings
 */

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
    require_once __DIR__ . '/../cors.php';
}

use App\Core\Database\Connection;

$method = $_SERVER['REQUEST_METHOD'];
$pdo = Connection::getInstance()->getPdo();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'PATCH':
            handlePatch($pdo);
            break;
        default:
            json_response(405, ['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    error_log('Admin settings error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to process request']);
}

function handleGet($pdo) {
    // Fetch all settings
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM platform_settings");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert to key-value array
    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }

    // Return settings with defaults if not found
    $data = [
        'maintenance_message' => $settings['maintenance_message'] ?? '',
        'terms_version' => $settings['terms_version'] ?? '1.0',
        'privacy_version' => $settings['privacy_version'] ?? '1.0',
        'platform_fee_percent' => $settings['platform_fee_percent'] ?? '5.00',
        'notify_admin_new_landlord' => $settings['notify_admin_new_landlord'] ?? '0',
    ];

    json_response(200, ['data' => $data]);
}

function handlePatch($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['settings']) || !is_array($input['settings'])) {
        json_response(400, ['error' => 'Missing or invalid settings object']);
    }

    $settings = $input['settings'];
    $allowedKeys = [
        'maintenance_message',
        'terms_version',
        'privacy_version',
        'platform_fee_percent',
        'notify_admin_new_landlord',
    ];

    foreach ($settings as $key => $value) {
        if (!in_array($key, $allowedKeys)) {
            continue; // Skip unknown keys
        }

        // Upsert setting
        $stmt = $pdo->prepare("
            INSERT INTO platform_settings (setting_key, setting_value, updated_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ");
        $stmt->execute([$key, $value]);
    }

    json_response(200, ['message' => 'Settings updated successfully']);
}
