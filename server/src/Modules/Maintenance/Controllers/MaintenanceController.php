<?php

namespace App\Modules\Maintenance\Controllers;

use App\Modules\Maintenance\Services\MaintenanceService;
use App\Api\Middleware;

/**
 * Maintenance Controller
 * Handles HTTP requests for maintenance system
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
    public function index($request)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $role = $user['role'];

        $filters = [];
        if (!empty($_GET['status'])) {
            $filters['status'] = $_GET['status'];
        }
        if ($role === 'landlord' && !empty($_GET['priority'])) {
            $filters['priority'] = $_GET['priority'];
        }

        $requests = $this->service->getUserRequests($userId, $role, $filters);

        json_response(200, ['data' => $requests]);
    }

    /**
     * Get a single maintenance request
     * GET /api/boarder/maintenance/:id
     * GET /api/landlord/maintenance/:id
     */
    public function show($request, $id)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $role = $user['role'];

        $maintenanceRequest = $this->service->getRequest((int) $id, $userId, $role);

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
            $result = $this->service->createRequest($data, $userId);
            json_response(201, ['data' => $result, 'message' => 'Maintenance request created successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to create maintenance request']);
        }
    }

    /**
     * Update request status (landlord only)
     * PATCH /api/landlord/maintenance/:id/status
     */
    public function updateStatus($request, $id)
    {
        $user = Middleware::authorize(['landlord']);
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
     * Add a comment to a maintenance request
     * POST /api/boarder/maintenance/:id/comment
     * POST /api/landlord/maintenance/:id/comment
     */
    public function addComment($request, $id)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $role = $user['role'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || empty($data['comment'])) {
            json_response(400, ['error' => 'Comment is required']);
            return;
        }

        $images = $data['images'] ?? null;

        try {
            $result = $this->service->addComment((int) $id, $userId, $role, $data['comment'], $images);
            json_response(200, ['data' => $result, 'message' => 'Comment added successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to add comment']);
        }
    }

    /**
     * Delete a maintenance request (landlord only)
     * DELETE /api/landlord/maintenance/:id
     */
    public function destroy($request, $id)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        try {
            $this->service->deleteRequest((int) $id, $userId);
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
    public function stats($request)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $role = $user['role'];

        $stats = $this->service->getStats($userId, $role);

        json_response(200, ['data' => $stats]);
    }

    /**
     * Bulk update status for multiple requests (landlord only)
     * PATCH /api/landlord/maintenance/bulk-status
     */
    public function bulkUpdateStatus($request)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data) {
            json_response(400, ['error' => 'Invalid JSON input']);
            return;
        }

        if (empty($data['request_ids']) || empty($data['status'])) {
            json_response(400, ['error' => 'request_ids and status are required']);
            return;
        }

        try {
            $result = $this->service->bulkUpdateStatus(
                $data['request_ids'],
                $data['status'],
                $userId
            );
            json_response(200, ['data' => $result, 'message' => "Bulk update completed. {$result['total_updated']} requests updated."]);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to update requests']);
        }
    }

    /**
     * Assign request to contractor (landlord only)
     * POST /api/landlord/maintenance/:id/assign
     */
    public function assignContractor($request, $id)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || empty($data['contractor_id'])) {
            json_response(400, ['error' => 'contractor_id is required']);
            return;
        }

        try {
            $result = $this->service->assignContractor((int) $id, (int) $data['contractor_id'], $userId);
            json_response(200, ['data' => $result, 'message' => 'Contractor assigned successfully']);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to assign contractor']);
        }
    }

    /**
     * Rate a resolved maintenance request (boarder only)
     * POST /api/boarder/maintenance/:id/rate
     */
    public function rateRequest($request, $id)
    {
        $user = Middleware::authorize(['boarder']);
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || empty($data['rating'])) {
            json_response(400, ['error' => 'rating is required']);
            return;
        }

        $rating = (int) $data['rating'];
        $feedback = $data['feedback'] ?? null;

        try {
            $result = $this->service->rateRequest((int) $id, $rating, $feedback, $userId);
            json_response(200, ['data' => $result, 'message' => 'Rating submitted successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to submit rating']);
        }
    }
}
