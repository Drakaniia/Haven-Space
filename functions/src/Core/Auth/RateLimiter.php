<?php

namespace App\Core\Auth;

use App\Core\Database\Connection;
use PDO;

class RateLimiter
{
    private const MAX_ATTEMPTS = 5;
    private const LOCKOUT_TIME = 300; // 5 minutes in seconds

    public static function check($ip)
    {
        $pdo = Connection::getInstance()->getPdo();
        $stmt = $pdo->prepare('SELECT attempts, last_attempt FROM login_attempts WHERE ip_address = ?');
        $stmt->execute([$ip]);
        $record = $stmt->fetch();

        if ($record) {
            $attempts = $record['attempts'];
            $lastAttempt = strtotime($record['last_attempt']);
            $now = time();

            if ($attempts >= self::MAX_ATTEMPTS && ($now - $lastAttempt) < self::LOCKOUT_TIME) {
                return false;
            }

            // If last attempt was more than lockout time ago, reset attempts
            if (($now - $lastAttempt) >= self::LOCKOUT_TIME) {
                self::reset($ip);
            }
        }

        return true;
    }

    public static function registerFailure($ip)
    {
        $pdo = Connection::getInstance()->getPdo();
        $stmt = $pdo->prepare('INSERT INTO login_attempts (ip_address, attempts) VALUES (?, 1) ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_attempt = CURRENT_TIMESTAMP');
        $stmt->execute([$ip]);
    }

    public static function reset($ip)
    {
        $pdo = Connection::getInstance()->getPdo();
        $stmt = $pdo->prepare('DELETE FROM login_attempts WHERE ip_address = ?');
        $stmt->execute([$ip]);
    }
}
