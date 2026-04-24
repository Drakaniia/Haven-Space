<?php

namespace App\Services;

use Appwrite\Client;
use Appwrite\Services\Users;

/**
 * AppwriteService
 *
 * Thin wrapper around the Appwrite server SDK.
 * Used to sync user labels (roles) in Appwrite after local DB operations.
 */
class AppwriteService
{
    private Client $client;
    private Users $users;

    public function __construct()
    {
        $config = require __DIR__ . '/../../config/app.php';

        $this->client = (new Client())
            ->setEndpoint($config['appwrite_endpoint'])
            ->setProject($config['appwrite_project_id'])
            ->setKey($config['appwrite_api_key']);

        $this->users = new Users($this->client);
    }

    /**
     * Assign a role label to an Appwrite user.
     * Valid labels: 'boarder', 'landlord', 'admin'
     *
     * @param string $appwriteUserId  The Appwrite user ID (not the local DB id)
     * @param string $role            One of: boarder, landlord, admin
     */
    public function assignRoleLabel(string $appwriteUserId, string $role): void
    {
        $allowed = ['boarder', 'landlord', 'admin'];
        if (!in_array($role, $allowed, true)) {
            throw new \InvalidArgumentException("Invalid role label: {$role}");
        }

        $this->users->updateLabels($appwriteUserId, [$role]);
    }

    /**
     * Create an Appwrite user that mirrors the local DB user,
     * then assign their role label.
     *
     * Returns the Appwrite user ID so it can be stored locally if needed.
     *
     * @param int    $localUserId  Local DB user id (used as Appwrite user ID prefix)
     * @param string $email
     * @param string $password
     * @param string $name         Full display name
     * @param string $role
     * @return string              Appwrite user ID
     */
    public function createUserWithRole(int $localUserId, string $email, string $password, string $name, string $role): string
    {
        // Use a deterministic ID so re-runs are idempotent
        $appwriteUserId = 'hs_' . $localUserId;

        $this->users->create(
            userId: $appwriteUserId,
            email: $email,
            password: $password,
            name: $name
        );

        $this->assignRoleLabel($appwriteUserId, $role);

        return $appwriteUserId;
    }
}
