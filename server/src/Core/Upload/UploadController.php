<?php

namespace App\Core\Upload;

/**
 * Upload Controller
 * Handles HTTP requests for file uploads
 */
class UploadController
{
    private UploadHandler $uploadHandler;

    public function __construct()
    {
        $this->uploadHandler = new UploadHandler();
    }

    /**
     * Handle file upload
     * POST /api/upload
     */
    public function upload($request)
    {
        if (!isset($_FILES['file'])) {
            return json_response(400, ['error' => 'No file uploaded']);
        }

        $subDirectory = $request['directory'] ?? null;
        $result = $this->uploadHandler->upload($_FILES['file'], $subDirectory);

        if ($result === false) {
            $errors = $this->uploadHandler->getErrors();
            return json_response(400, ['error' => $errors[0] ?? 'Upload failed']);
        }

        return json_response(200, [
            'success' => true,
            'file_url' => $result,
        ]);
    }

    /**
     * Handle multiple file upload
     * POST /api/upload/multiple
     */
    public function uploadMultiple($request)
    {
        if (!isset($_FILES['files'])) {
            return json_response(400, ['error' => 'No files uploaded']);
        }

        $subDirectory = $request['directory'] ?? null;
        $files = $_FILES['files'];

        // Restructure $_FILES for multiple files
        $restructured = [];
        for ($i = 0; $i < count($files['name']); $i++) {
            $restructured[] = [
                'name' => $files['name'][$i],
                'type' => $files['type'][$i],
                'tmp_name' => $files['tmp_name'][$i],
                'error' => $files['error'][$i],
                'size' => $files['size'][$i],
            ];
        }

        $result = $this->uploadHandler->uploadMultiple($restructured, $subDirectory);

        if ($result === false) {
            $errors = $this->uploadHandler->getErrors();
            return json_response(400, ['error' => $errors[0] ?? 'Upload failed']);
        }

        return json_response(200, [
            'success' => true,
            'file_urls' => $result,
        ]);
    }

    /**
     * Delete a file
     * DELETE /api/upload/{fileUrl}
     */
    public function delete($request, $fileUrl)
    {
        $result = $this->uploadHandler->delete($fileUrl);

        if (!$result) {
            return json_response(404, ['error' => 'File not found']);
        }

        return json_response(200, ['success' => true]);
    }
}
