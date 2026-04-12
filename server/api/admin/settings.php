<?php
/**
 * Admin — platform settings (key/value)
 *
 * GET  — all settings
 * PATCH { settings: { key: value, ... } }
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

header('Content-Type: application/json');

use App\Api\Middleware;
use App\Core\Database\Connection;

Middleware::authorize(['admin']);

$pdo = Connection::getInstance()->getPdo();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $rows = $pdo->query('SELECT setting_key, setting_value, updated_at FROM platform_settings ORDER BY setting_key')
            ->fetchAll();
        $map = [];
        foreach ($rows as $row) {
            $map[$row['setting_key']] = $row['setting_value'];
        }
        echo json_encode(['success' => true, 'data' => $map, 'rows' => $rows]);
    } catch (\PDOException $e) {
        error_log('Admin settings get error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to load settings']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true);
    $settings = $input['settings'] ?? null;
    if (!is_array($settings) || empty($settings)) {
        http_response_code(400);
        echo json_encode(['error' => 'settings object required']);
        exit;
    }

    $allowedKeys = [
        'maintenance_message',
        'terms_version',
        'privacy_version',
        'notify_admin_new_landlord',
        'platform_fee_percent',
    ];

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            'INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
        );
        foreach ($settings as $key => $value) {
            if (!in_array($key, $allowedKeys, true)) {
                continue;
            }
            $stmt->execute([$key, (string) $value]);
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Settings saved']);
    } catch (\PDOException $e) {
        $pdo->rollBack();
        error_log('Admin settings patch error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save settings']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
