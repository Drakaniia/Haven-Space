<?php

namespace App\Core\Upload;

/**
 * File Upload Handler
 * Handles file uploads with validation and storage
 */
class UploadHandler
{
    private string $uploadPath;
    private array $allowedTypes;
    private int $maxFileSize;
    private array $errors = [];

    public function __construct(string $uploadPath = '', array $allowedTypes = [], int $maxFileSize = 10485760)
    {
        if (empty($uploadPath)) {
            // Default to absolute path relative to project root
            $this->uploadPath = realpath(__DIR__ . '/../../../../storage/uploads');
            if (!$this->uploadPath) {
                // If realpath fails (dir doesn't exist yet), construct it
                $this->uploadPath = __DIR__ . '/../../../../storage/uploads';
            }
        } else {
            $this->uploadPath = rtrim($uploadPath, '/');
        }
        $this->allowedTypes = $allowedTypes ?: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        $this->maxFileSize = $maxFileSize; // Default: 10MB

        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }

    /**
     * Upload a single file
     * @param array $file $_FILES array element
     * @param string|null $subDirectory Optional subdirectory (e.g., 'maintenance', 'documents')
     * @return string|false File URL on success, false on failure
     */
    public function upload(array $file, ?string $subDirectory = null)
    {
        $this->errors = [];

        if (!$this->validateFile($file)) {
            return false;
        }

        $directory = $this->uploadPath;
        if ($subDirectory) {
            $directory .= '/' . trim($subDirectory, '/');
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }
        }

        $extension = $this->getFileExtension($file['name']);
        $fileName = uniqid('file_', true) . '.' . $extension;
        $destination = $directory . '/' . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            $this->errors[] = 'Failed to move uploaded file';
            return false;
        }

        // Return relative path for storage in database
        return str_replace($this->uploadPath . '/', '', $destination);
    }

    /**
     * Upload multiple files
     * @param array $files $_FILES array element
     * @param string|null $subDirectory
     * @return array|false Array of file URLs on success, false on failure
     */
    public function uploadMultiple(array $files, ?string $subDirectory = null)
    {
        $uploadedFiles = [];

        foreach ($files as $file) {
            $result = $this->upload($file, $subDirectory);
            if ($result === false) {
                return false;
            }
            $uploadedFiles[] = $result;
        }

        return $uploadedFiles;
    }

    /**
     * Delete a file
     * @param string $filePath
     * @return bool
     */
    public function delete(string $filePath): bool
    {
        $fullPath = $this->uploadPath . '/' . $filePath;
        if (file_exists($fullPath)) {
            return unlink($fullPath);
        }
        return false;
    }

    /**
     * Get upload errors
     * @return array
     */
    public function getErrors(): array
    {
        return $this->errors;
    }

    /**
     * Validate uploaded file
     * @param array $file
     * @return bool
     */
    private function validateFile(array $file): bool
    {
        if (!isset($file['error']) || is_array($file['error'])) {
            $this->errors[] = 'Invalid file upload';
            return false;
        }

        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->errors[] = 'File upload failed with error code: ' . $file['error'];
            return false;
        }

        // Check file size
        if ($file['size'] > $this->maxFileSize) {
            $this->errors[] = 'File size exceeds maximum allowed size (' . ($this->maxFileSize / 1048576) . 'MB)';
            return false;
        }

        // Check file type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $this->allowedTypes)) {
            $this->errors[] = 'File type not allowed: ' . $mimeType;
            return false;
        }

        return true;
    }

    /**
     * Get file extension safely
     * @param string $fileName
     * @return string
     */
    private function getFileExtension(string $fileName): string
    {
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        return strtolower($extension) ?: 'bin';
    }
}
