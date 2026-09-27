<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Candle extends Model
{
    protected $fillable = [
        'asset',
        'color',
        'open_price',
        'close_price',
        'candle_size',
        'candle_time',
        'period',
        'hour_of_day',
        'next_color',
    ];

    protected $casts = [
        'open_price'  => 'float',
        'close_price' => 'float',
        'candle_size' => 'float',
        'candle_time' => 'integer',
        'hour_of_day' => 'integer',
        'period'      => 'integer',
    ];
}
