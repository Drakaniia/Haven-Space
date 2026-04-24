<?php

namespace App\Modules\Maintenance\Controllers;

use App\Modules\Maintenance\Services\MaintenanceService;
use App\Api\Middleware;

/**
 * Maintenance Controller
 * Handles HTTP requests for maintenance requests
 */
class MaintenanceController
{
    private MaintenanceService $service;

    public function __construct()
    {
        $this->service = new MaintenanceService();
    }

    /**
     * Get all maintenance requests for current user
     * GET /api/boarder/maintenance (boarder)
     * GET /api/landlord/maintenance (landlord)
     */
    public function index($request = [])
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $role = $user['role'];

        $maintenanceRequests = $this->service->getUserMaintenanceRequests($userId, $role);

        json_response(200, ['data' => $maintenanceRequests]);
    }

    /**
     * Get a single maintenance request
     * GET /api/boarder/maintenance/:id
     * GET /api/landlord/maintenance/:id
     */
    public function show($request = [], $id = null)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $role = $user['role'];

        $maintenanceRequest = $this->service->getMaintenanceRequest((int) $id, $userId, $role);

        if (!$maintenanceRequest) {
            json_response(404, ['error' => 'Maintenance request not found']);
            return;
        }

        json_response(200, ['data' => $maintenanceRequest]);
    }

    /**
     * Create a new maintenance request (boarder only)
     * POST /api/boarder/maintenance
     */
    public function store($request = [])
    {
        $user = Middleware::authorize(['boarder']);
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data) {
            json_response(400, ['error' => 'Invalid JSON input']);
            return;
        }

        try {
            $result = $this->service->createMaintenanceRequest($data, $userId);
            json_response(201, ['data' => $result, 'message' => 'Maintenance request created successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to create maintenance request']);
        }
    }

    /**
     * Update maintenance request status (landlord only)
     * PATCH /api/landlord/maintenance/:id/status
     */
    public function updateStatus($request = [], $id = null)
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
     * Bulk update maintenance request statuses (landlord only)
     * PATCH /api/landlord/maintenance/bulk-status
     */
    public function bulkUpdateStatus($request = [])
    {
        $user = Middleware::authorizeVerifiedLandlord();
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || empty($data['ids']) || empty($data['status'])) {
            json_response(400, ['error' => 'IDs and status are required']);
            return;
        }

        try {
            $result = $this->service->bulkUpdateStatus($data['ids'], $data['status'], $userId);
            json_response(200, ['data' => $result, 'message' => 'Statuses updated successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to update statuses']);
        }
    }

    /**
     * Add a comment to a maintenance request
     * POST /api/boarder/maintenance/:id/comment
     * POST /api/landlord/maintenance/:id/comment
     */
    public function addComment($request = [], $id = null)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $role = $user['role'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || empty($data['comment'])) {
            json_response(400, ['error' => 'Comment is required']);
            return;
        }

        try {
            $result = $this->service->addComment((int) $id, $data['comment'], $userId, $role);
            json_response(201, ['data' => $result, 'message' => 'Comment added successfully']);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to add comment']);
        }
    }

    /**
     * Rate a completed maintenance request (boarder only)
     * POST /api/boarder/maintenance/:id/rate
     */
    public function rateRequest($request = [], $id = null)
    {
        $user = Middleware::authorize(['boarder']);
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['rating'])) {
            json_response(400, ['error' => 'Rating is required']);
            return;
        }

        try {
            $result = $this->service->rateRequest((int) $id, $data['rating'], $userId);
            json_response(200, ['data' => $result, 'message' => 'Rating submitted successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to submit rating']);
        }
    }

    /**
     * Assign a contractor to a maintenance request (landlord only)
     * POST /api/landlord/maintenance/:id/assign
     */
    public function assignContractor($request = [], $id = null)
    {
        $user = Middleware::authorizeVerifiedLandlord();
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || empty($data['contractor_name'])) {
            json_response(400, ['error' => 'Contractor name is required']);
            return;
        }

        try {
            $result = $this->service->assignContractor((int) $id, $data['contractor_name'], $userId);
            json_response(200, ['data' => $result, 'message' => 'Contractor assigned successfully']);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to assign contractor']);
        }
    }

    /**
     * Delete a maintenance request (landlord only)
     * DELETE /api/landlord/maintenance/:id
     */
    public function destroy($request = [], $id = null)
    {
        $user = Middleware::authorizeVerifiedLandlord();
        $userId = $user['user_id'];

        try {
            $this->service->deleteMaintenanceRequest((int) $id, $userId);
            json_response(200, ['message' => 'Maintenance request deleted successfully']);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to delete maintenance request']);
        }
    }

    /**
     * Get maintenance statistics
     * GET /api/maintenance/stats
     */
    public function stats($request = [])
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $role = $user['role'];

        try {
            $stats = $this->service->getStats($userId, $role);
            json_response(200, ['data' => $stats]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to retrieve statistics']);
        }
    }
}
