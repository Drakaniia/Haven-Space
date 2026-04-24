<?php

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

header('Content-Type: application/json');

use App\Core\Database\Connection;
use App\Core\Upload\FileUpload;

// Authenticate user
$user = Middleware::authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

// Only landlords can upload verification documents
if ($user['role'] !== 'landlord') {
    http_response_code(403);
    echo json_encode(['error' => 'Only landlords can upload verification documents']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$documentType = $_POST['documentType'] ?? '';
$allowedDocumentTypes = [
    'government_id_front',
    'government_id_back', 
    'selfie_with_id',
    'business_registration',
    'tax_id',
    'property_title',
    'tax_declaration',
    'business_permit',
    'property_photos'
];

if (!in_array($documentType, $allowedDocumentTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid document type']);
    exit;
}

if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded or upload error']);
    exit;
}

$file = $_FILES['document'];

// Validate file type
$allowedMimeTypes = [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'application/pdf'
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedMimeTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.']);
    exit;
}

// Validate file size (max 10MB)
$maxFileSize = 10 * 1024 * 1024; // 10MB
if ($file['size'] > $maxFileSize) {
    http_response_code(400);
    echo json_encode(['error' => 'File size too large. Maximum size is 10MB.']);
    exit;
}

$pdo = Connection::getInstance()->getPdo();

try {
    // Create upload directory if it doesn't exist
    $uploadDir = __DIR__ . '/../../uploads/verification-documents/' . $user['user_id'];
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Generate unique filename
    $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $fileName = $documentType . '_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $fileExtension;
    $filePath = $uploadDir . '/' . $fileName;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Failed to save uploaded file');
    }

    // Store file info in database
    $stmt = $pdo->prepare('
        INSERT INTO landlord_verification_documents 
        (user_id, document_type, file_url, file_name, file_size, mime_type, upload_status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');
    
    $fileUrl = '/uploads/verification-documents/' . $user['user_id'] . '/' . $fileName;
    $stmt->execute([
        $user['user_id'],
        $documentType,
        $fileUrl,
        $file['name'],
        $file['size'],
        $mimeType,
        'pending'
    ]);

    $documentId = $pdo->lastInsertId();

    // Check if all required documents are uploaded
    $stmt = $pdo->prepare('
        SELECT COUNT(DISTINCT document_type) as uploaded_count
        FROM landlord_verification_documents 
        WHERE user_id = ? AND document_type IN (?, ?, ?)
    ');
    $stmt->execute([$user['user_id'], 'government_id_front', 'government_id_back', 'selfie_with_id']);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $requiredDocsUploaded = $result['uploaded_count'] >= 3;

    echo json_encode([
        'success' => true,
        'message' => 'Document uploaded successfully',
        'documentId' => $documentId,
        'documentType' => $documentType,
        'fileName' => $file['name'],
        'fileSize' => $file['size'],
        'requiredDocsComplete' => $requiredDocsUploaded,
        'nextSteps' => $requiredDocsUploaded ? 
            ['All required documents uploaded. Your account will be reviewed by our team.'] :
            ['Continue uploading required documents: Government ID (front & back) and selfie with ID']
    ]);

} catch (\Exception $e) {
    error_log('Document upload error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to upload document. Please try again.']);
}