<?php

namespace Tests\Api;

class TestCest
{
    public function testPublicEndpoint(\Tests\Support\ApiTester $I)
    {
        $I->wantTo('test public API endpoint');
        $I->haveHttpHeader('Content-Type', 'application/json');
        $I->sendGET('/api/test');
        
        $I->seeResponseCodeIs(200);
        $I->seeResponseIsJson();
        $I->seeResponseContains('"status":"success"');
    }
}
