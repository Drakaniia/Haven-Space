<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Appwrite\Client;
use Appwrite\Services\Databases;
use Appwrite\Services\Users;
use Appwrite\Services\Account;

class AppwriteService {
    private $client;
    private $databases;
    private $users;
    private $account;
    
    public function __construct() {
        $this->client = new Client();
        $this->client
            ->setEndpoint($_ENV['APPWRITE_ENDPOINT'])
            ->setProject($_ENV['APPWRITE_PROJECT_ID'])
            ->setKey($_ENV['APPWRITE_API_KEY']);
            
        $this->databases = new Databases($this->client);
        $this->users = new Users($this->client);
        $this->account = new Account($this->client);
    }
    
    public function getDatabases() {
        return $this->databases;
    }
    
    public function getUsers() {
        return $this->users;
    }
    
    public function getAccount() {
        return $this->account;
    }
    
    public function getClient() {
        return $this->client;
    }
}

// Global instance
$appwrite = new AppwriteService();