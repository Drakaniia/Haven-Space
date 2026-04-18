<?php
require_once 'server/src/Core/bootstrap.php';
use App\Core\Database\Connection;

// Replace with the email you want to clear
$emailToClear = 'your-email@example.com'; // CHANGE THIS

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Start transaction
    $pdo->beginTransaction();
    
    // Get user ID first
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$emailToClear]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        $userId = $user['id'];
        
        // Delete related records first (foreign key constraints)
        $pdo->prepare('DELETE FROM landlord_verification_data WHERE user_id = ?')->execute([$userId]);
        $pdo->prepare('DELETE FROM property_locations WHERE landlord_id IN (SELECT id FROM landlord_profiles WHERE user_id = ?)')->execute([$userId]);
        $pdo->prepare('DELETE FROM landlord_profiles WHERE user_id = ?')->execute([$userId]);
        $pdo->prepare('DELETE FROM boarder_profiles WHERE user_id = ?')->execute([$userId]);
        
        // Delete the user
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
        
        $pdo->commit();
        echo "User with email '$emailToClear' has been deleted successfully.\n";
    } else {
        echo "No user found with email '$emailToClear'.\n";
    }
} catch (Exception $e) {
    $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}
?>