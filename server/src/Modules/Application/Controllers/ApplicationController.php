<?php

namespace App\Modules\Application\Controllers;

use App\Modules\Application\Services\ApplicationService;
use App\Api\Middleware;

/**
 * Application Controller
 * Handles HTTP requests for rental applications
 */
class ApplicationController
{
    private ApplicationService $service;

    public function __construct()
    {
        $this->service = new ApplicationService();
    }

    /**
     * Get all applications for current user
     * GET /api/boarder/applications (boarder)
     * GET /api/landlord/applications (landlord)
     */
    public function index($request)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $role = $user['role'];

        $applications = $this->service->getUserApplications($userId, $role);

        json_response(200, ['data' => $applications]);
    }

    /**
     * Get a single application
     * GET /api/boarder/applications/:id
     * GET /api/landlord/applications/:id
     */
    public function show($request, $id)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $role = $user['role'];

        $application = $this->service->getApplication((int) $id, $userId, $role);

        if (!$application) {
            json_response(404, ['error' => 'Application not found']);
            return;
        }

        json_response(200, ['data' => $application]);
    }

    /**
     * Create a new application (boarder only)
     * POST /api/boarder/applications
     */
    public function store($request)
    {
        $user = Middleware::authorize(['boarder']);
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data) {
            json_response(400, ['error' => 'Invalid JSON input']);
            return;
        }

        try {
            $result = $this->service->createApplication($data, $userId);
            json_response(201, ['data' => $result, 'message' => 'Application created successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to create application']);
        }
    }

    /**
     * Update application status (landlord only)
     * PATCH /api/landlord/applications/:id/status
     */
    public function updateStatus($request, $id)
    {
        $user = Middleware::authorizeVerifiedLandlord();
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || empty($data['status'])) {
            json_response(400, ['error' => 'Status is required']);
            return;
        }

        try {
            $result = $this->service->updateStatus((int) $id, $data['status'], $userId);
            json_response(200, ['data' => $result, 'message' => 'Status updated successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to update status']);
        }
    }

    /**
     * Delete an application (boarder only)
     * DELETE /api/boarder/applications/:id
     */
    public function destroy($request, $id)
    {
        $user = Middleware::authorize(['boarder']);
        $userId = $user['user_id'];

        try {
            $this->service->deleteApplication((int) $id, $userId);
            json_response(200, ['message' => 'Application deleted successfully']);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to delete application']);
        }
    }
}
