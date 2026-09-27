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
        Schema::create('candles', function (Blueprint $table) {
            $table->id();
            $table->string('asset', 50);           // EURUSD_otc
            $table->char('color', 1);              // G or R
            $table->decimal('open_price', 12, 6);  // Open price
            $table->decimal('close_price', 12, 6); // Close price
            $table->decimal('candle_size', 8, 6)->nullable(); // % move
            $table->bigInteger('candle_time');     // Unix timestamp of candle start
            $table->integer('period')->default(60);// Candle period in seconds
            $table->tinyInteger('hour_of_day');    // 0-23 (for time analysis)
            $table->char('next_color', 1)->nullable(); // Next candle color (label - baad mein update hoga)
            $table->timestamps();

            // Indexes for fast querying
            $table->index('asset');
            $table->index('candle_time');
            $table->index(['asset', 'color']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('candles');
    }
};
