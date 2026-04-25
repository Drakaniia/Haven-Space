<?php

/**
 * Boarder Dashboard Stats API
 * GET /api/boarder/dashboard/stats
 *
 * Returns dashboard statistics for the logged-in boarder:
 * - Total applications
 * - Pending applications
 * - Accepted applications
 * - Saved properties count
 * - Profile completion percentage
 */

// CORS headers must be set before any output
require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

// Authenticate user and authorize as boarder
$user = Middleware::authorize(['boarder']);
$boarderId = $user['user_id'];

try {
    $pdo = Connection::getInstance()->getPdo();

    // 1. Get Application Statistics
    $stmt = $pdo->prepare(" 
        SELECT
            COUNT(*) as total_applications,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_applications,
            COALESCE(SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END), 0) as accepted_applications,
            COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected_applications
        FROM applications
        WHERE boarder_id = ? AND deleted_at IS NULL
    ");
    $stmt->execute([$boarderId]);
    $applicationStats = $stmt->fetch(PDO::FETCH_ASSOC);

    // 2. Get Saved Properties Count
    $stmt = $pdo->prepare(" 
        SELECT COUNT(*) as count 
        FROM saved_listings 
        WHERE boarder_id = ? AND deleted_at IS NULL
    ");
    $stmt->execute([$boarderId]);
    $savedPropertiesResult = $stmt->fetch(PDO::FETCH_ASSOC);
    $savedPropertiesCount = intval($savedPropertiesResult['count']);

    // 3. Calculate Profile Completion
    // Check user profile fields completion
    $stmt = $pdo->prepare("
        SELECT 
            first_name, last_name, email, phone_number, current_address, date_of_birth, gender, employment_status,
            emergency_contact_name, emergency_contact_phone, avatar_url
        FROM users 
        WHERE id = ?
    ");
    $stmt->execute([$boarderId]);
    $userProfile = $stmt->fetch(PDO::FETCH_ASSOC);

    // Calculate completion percentage based on filled fields
    $profileFields = [
        'name' => !empty($userProfile['first_name']) && !empty($userProfile['last_name']),
        'email' => !empty($userProfile['email']),
        'phone' => !empty($userProfile['phone_number']),
        'address' => !empty($userProfile['current_address']),
        'date_of_birth' => !empty($userProfile['date_of_birth']),
        'gender' => !empty($userProfile['gender']),
        'employment_status' => !empty($userProfile['employment_status']),
        'emergency_contact_name' => !empty($userProfile['emergency_contact_name']),
        'emergency_contact_phone' => !empty($userProfile['emergency_contact_phone']),
        'avatar_url' => !empty($userProfile['avatar_url']),
    ];

    $completedFields = array_sum($profileFields);
    $totalFields = count($profileFields);
    $profileCompletionPercentage = round(($completedFields / $totalFields) * 100);

    // Create checklist for profile completion
    $profileChecklist = [
        [
            'field' => 'basic_info',
            'label' => 'Basic Information',
            'completed' => $profileFields['name'] && $profileFields['email'] && $profileFields['phone']
        ],
        [
            'field' => 'personal_details',
            'label' => 'Personal Details',
            'completed' => $profileFields['date_of_birth'] && $profileFields['gender'] && $profileFields['address']
        ],
        [
            'field' => 'profile_photo',
            'label' => 'Profile Photo',
            'completed' => $profileFields['avatar_url']
        ],
        [
            'field' => 'employment_info',
            'label' => 'Employment Information',
            'completed' => $profileFields['employment_status']
        ],
        [
            'field' => 'emergency_contact',
            'label' => 'Emergency Contact',
            'completed' => $profileFields['emergency_contact_name'] && $profileFields['emergency_contact_phone']
        ]
    ];

    json_response(200, [
        'data' => [
            'applications' => [
                'total' => intval($applicationStats['total_applications']),
                'pending' => intval($applicationStats['pending_applications']),
                'accepted' => intval($applicationStats['accepted_applications']),
                'rejected' => intval($applicationStats['rejected_applications'])
            ],
            'saved_properties' => [
                'count' => $savedPropertiesCount
            ],
            'profile_completion' => [
                'percentage' => $profileCompletionPercentage,
                'completed_fields' => $completedFields,
                'total_fields' => $totalFields,
                'checklist' => $profileChecklist
            ]
        ]
    ]);

} catch (Exception $e) {
    error_log('Boarder dashboard stats error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to load dashboard statistics']);
}