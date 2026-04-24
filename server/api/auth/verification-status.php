<?php

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

header('Content-Type: application/json');

use App\Core\Database\Connection;

// Authenticate user
$user = Middleware::authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$pdo = Connection::getInstance()->getPdo();

try {
    // Get user verification status
    $stmt = $pdo->prepare('
        SELECT 
            u.email_verified,
            u.account_status,
            u.verification_status,
            u.verification_notes,
            ur.role_name as role
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.id = ? AND u.deleted_at IS NULL
    ');
    $stmt->execute([$user['user_id']]);
    $userStatus = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$userStatus) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    $response = [
        'success' => true,
        'emailVerified' => (bool)$userStatus['email_verified'],
        'accountStatus' => $userStatus['account_status'],
        'verificationStatus' => $userStatus['verification_status'],
        'verificationNotes' => $userStatus['verification_notes'],
        'role' => $userStatus['role']
    ];

    // Add role-specific verification details
    if ($userStatus['role'] === 'landlord') {
        // Get landlord profile verification status
        $stmt = $pdo->prepare('
            SELECT 
                lp.verification_status as profile_verification_status,
                lp.verification_submitted_at,
                lp.verification_reviewed_at,
                lp.verification_notes as profile_verification_notes
            FROM landlord_profiles lp
            WHERE lp.user_id = ?
        ');
        $stmt->execute([$user['user_id']]);
        $profileStatus = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($profileStatus) {
            $response['profileVerificationStatus'] = $profileStatus['profile_verification_status'];
            $response['verificationSubmittedAt'] = $profileStatus['verification_submitted_at'];
            $response['verificationReviewedAt'] = $profileStatus['verification_reviewed_at'];
            $response['profileVerificationNotes'] = $profileStatus['profile_verification_notes'];
        }

        // Get uploaded documents status
        $stmt = $pdo->prepare('
            SELECT 
                document_type,
                upload_status,
                rejection_reason,
                uploaded_at
            FROM landlord_verification_documents
            WHERE user_id = ?
            ORDER BY uploaded_at DESC
        ');
        $stmt->execute([$user['user_id']]);
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response['documents'] = $documents;

        // Check required documents completion
        $requiredDocs = ['government_id_front', 'government_id_back', 'selfie_with_id'];
        $uploadedRequiredDocs = array_filter($documents, function($doc) use ($requiredDocs) {
            return in_array($doc['document_type'], $requiredDocs);
        });

        $response['requiredDocsComplete'] = count($uploadedRequiredDocs) >= 3;
        $response['totalDocuments'] = count($documents);

        // Determine next steps
        $nextSteps = [];
        if (!$response['emailVerified']) {
            $nextSteps[] = 'Verify your email address';
        } elseif (!$response['requiredDocsComplete']) {
            $nextSteps[] = 'Upload required verification documents (Government ID front & back, selfie with ID)';
        } elseif ($response['verificationStatus'] === 'pending') {
            $nextSteps[] = 'Wait for admin review (usually 24-48 hours)';
        } elseif ($response['verificationStatus'] === 'approved') {
            $nextSteps[] = 'Start creating property listings';
        } elseif ($response['verificationStatus'] === 'rejected') {
            $nextSteps[] = 'Review rejection notes and resubmit required documents';
        }

        $response['nextSteps'] = $nextSteps;
    } elseif ($userStatus['role'] === 'boarder') {
        // Get boarder profile completion status
        $stmt = $pdo->prepare('
            SELECT profile_completed
            FROM boarder_profiles
            WHERE user_id = ?
        ');
        $stmt->execute([$user['user_id']]);
        $profileStatus = $stmt->fetch(PDO::FETCH_ASSOC);

        $response['profileCompleted'] = $profileStatus ? (bool)$profileStatus['profile_completed'] : false;

        // Determine next steps for boarders
        $nextSteps = [];
        if (!$response['emailVerified']) {
            $nextSteps[] = 'Verify your email address to apply to rooms';
        } else {
            $nextSteps[] = 'Browse available rooms and submit applications';
            if (!$response['profileCompleted']) {
                $nextSteps[] = 'Complete your profile to improve application success';
            }
        }

        $response['nextSteps'] = $nextSteps;
    }

    echo json_encode($response);

} catch (\PDOException $e) {
    error_log('Verification status error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to get verification status']);
}