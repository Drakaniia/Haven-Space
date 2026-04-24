<?php
/**
 * Haven Space API Function Deployment Script
 * 
 * This PHP script validates the environment and executes the Appwrite CLI deployment.
 * It provides the same functionality as deploy-function.sh but in a Windows-compatible format.
 */

echo "🚀 Deploying Haven Space API Function to Appwrite...\n";
echo "==================================================\n\n";

// Check if appwrite.json exists
if (!file_exists('appwrite.json')) {
    echo "❌ appwrite.json not found. Please ensure you're in the project root.\n";
    exit(1);
}

// Check if Appwrite CLI is available
$appwritePath = null;
if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
    // Windows - check if appwrite is in PATH
    $output = [];
    $returnVar = 0;
    exec('where appwrite 2>&1', $output, $returnVar);
    if ($returnVar === 0 && !empty($output)) {
        $appwritePath = trim($output[0]);
    }
} else {
    // Unix-like systems
    $output = [];
    $returnVar = 0;
    exec('command -v appwrite 2>&1', $output, $returnVar);
    if ($returnVar === 0 && !empty($output)) {
        $appwritePath = trim($output[0]);
    }
}

if (empty($appwritePath)) {
    echo "❌ Appwrite CLI not found. Please install it first:\n";
    echo "   npm install -g appwrite-cli\n";
    echo "   or\n";
    echo "   bun add global appwrite\n";
    exit(1);
}

echo "✅ Appwrite CLI found at: $appwritePath\n";
echo "📦 Deploying function...\n";

// Run the deployment command
$command = 'appwrite push functions --function-id api-function --force --activate';
echo "Executing: $command\n\n";

passthru($command, $returnVar);

echo "\n";

if ($returnVar === 0) {
    echo "✅ Function deployed successfully!\n";
    echo "\n";
    echo "🔗 Your API endpoints will be available at:\n";
    echo "   https://fra.cloud.appwrite.io/v1/functions/api-function/executions\n";
    echo "\n";
    echo "📋 Available endpoints:\n";
    echo "   GET  / - Root endpoint\n";
    echo "   GET  /health - Health check\n";
    echo "   GET  /api/users - List users\n";
    echo "   POST /api/users - Create user\n";
    echo "   GET  /api/properties - List properties\n";
    echo "   POST /api/properties - Create property\n";
    echo "   GET  /api/applications - List applications\n";
    echo "   POST /api/applications - Create application\n";
    echo "\n";
    echo "⚠️  Remember to:\n";
    echo "   1. Update database and table IDs in main.php\n";
    echo "   2. Configure proper permissions\n";
    echo "   3. Test the endpoints\n";
} else {
    echo "❌ Deployment failed. Please check the error messages above.\n";
    exit(1);
}