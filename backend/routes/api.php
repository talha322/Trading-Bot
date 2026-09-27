<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\CandleController;

// API v1 Routes
Route::prefix('v1')->group(function () {

    // Candle Data Collection
    Route::post('/candles', [CandleController::class, 'store']);
    Route::get('/candles/stats', [CandleController::class, 'stats']);

});
