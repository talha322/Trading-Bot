<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('candles', function (Blueprint $table) {
            $table->unique(['asset', 'candle_time'], 'candles_asset_time_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('candles', function (Blueprint $table) {
            $table->dropUnique('candles_asset_time_unique');
        });
    }
};
