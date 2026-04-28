<?php

declare(strict_types=1);

namespace Tests\Support;

/**
 * Inherited Methods
 * @method void wantTo($text)
 * @method void wantToTest($text)
 * @method void execute($callable)
 * @method void expectTo($prediction)
 * @method void expect($prediction)
 * @method void amGoingTo($argumentation)
 * @method void am($role)
 * @method void lookForwardTo($achieveValue)
 * @method void comment($description)
 * @method void pause($vars = [])
 *
 * @SuppressWarnings(PHPMD)
*/

// Load Composer autoloader
require_once __DIR__ . '/../../vendor/autoload.php';

// Load the generated actions trait
require_once __DIR__ . '/_generated/ApiTesterActions.php';

class ApiTester extends \Codeception\Actor
{
    use \Tests\Support\_generated\ApiTesterActions;

    /**
     * Define custom actions here
     */
}
