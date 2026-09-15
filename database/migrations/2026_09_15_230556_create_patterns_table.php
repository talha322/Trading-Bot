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
        Schema::create('patterns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->json('sequence'); // ["G","R","R","R","R","R","R","R"]
            $table->string('asset')->default('EURUSD'); // e.g. EURUSD, BTCUSD
            $table->integer('timeframe')->default(1); // minutes: 1, 5, 15
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patterns');
    }
};
