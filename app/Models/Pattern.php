<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pattern extends Model
{
    protected $fillable = ['name', 'sequence', 'asset', 'timeframe', 'is_active'];

    protected $casts = [
        'sequence'  => 'array',
        'is_active' => 'boolean',
    ];

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    /**
     * Sequence ko string ke roop mein return karo (e.g. "🟢🔴🔴🔴")
     */
    public function sequenceEmoji(): string
    {
        return implode('', array_map(fn($c) => $c === 'G' ? '🟢' : '🔴', $this->sequence));
    }
}
