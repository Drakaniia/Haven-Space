<?php
// Test script for AI chat functionality using cURL
$url = 'https://fra.cloud.appwrite.io/v1/functions/api-function/executions';

$data = [
    'path' => '/api/chat',
    'method' => 'POST',
    'message' => 'Hello, can you help me find a room?',
    'session_id' => 'test_session_' . time(),
    'user_id' => 'test_user'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Appwrite-Project: 69eae504002697b6749c'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For testing only

$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
if ($error) {
    echo "cURL Error: $error\n";
}
echo "Response:\n";
echo $result;
echo "\n\nParsed:\n";
print_r(json_decode($result, true));
?>