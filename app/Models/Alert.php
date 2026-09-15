<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    protected $fillable = ['pattern_id', 'asset', 'candles_data', 'telegram_sent', 'matched_at'];

    protected $casts = [
        'candles_data'  => 'array',
        'telegram_sent' => 'boolean',
        'matched_at'    => 'datetime',
    ];

    public function pattern(): BelongsTo
    {
        return $this->belongsTo(Pattern::class);
    }
}
