<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Candle;
use Illuminate\Http\Request;

class CandleController extends Controller
{
    /**
     * Store a new candle from the extension.
     * POST /api/v1/candles
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset'       => 'required|string|max:50',
            'color'       => 'required|in:G,R',
            'open_price'  => 'required|numeric',
            'close_price' => 'required|numeric',
            'candle_time' => 'required|integer',
            'period'      => 'sometimes|integer',
        ]);

        // Calculate candle size (% move)
        $candleSize = abs($validated['close_price'] - $validated['open_price']) / $validated['open_price'];

        // Hour of day from candle_time (Pakistan time Asia/Karachi)
        $hourOfDay = (int) \Carbon\Carbon::createFromTimestamp($validated['candle_time'], 'Asia/Karachi')->hour;

        // Duplicate check — same asset + same candle_time already saved?
        $exists = Candle::where('asset', $validated['asset'])
                        ->where('candle_time', $validated['candle_time'])
                        ->exists();

        if ($exists) {
            return response()->json([
                'status'  => 'skipped',
                'message' => 'Candle already exists.',
            ], 200);
        }

        // Update previous candle's next_color (label)
        Candle::where('asset', $validated['asset'])
              ->whereNull('next_color')
              ->orderBy('candle_time', 'desc')
              ->first()?->update(['next_color' => $validated['color']]);

        try {
            // Save new candle
            $candle = Candle::create([
                'asset'       => $validated['asset'],
                'color'       => $validated['color'],
                'open_price'  => $validated['open_price'],
                'close_price' => $validated['close_price'],
                'candle_size' => $candleSize,
                'candle_time' => $validated['candle_time'],
                'period'      => $validated['period'] ?? 60,
                'hour_of_day' => $hourOfDay,
                'next_color'  => null,
            ]);

            return response()->json([
                'status'  => 'saved',
                'message' => 'Candle saved successfully.',
                'id'      => $candle->id,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'skipped',
                'message' => 'Candle already exists (duplicate prevented).',
            ], 200);
        }
    }

    /**
     * Get total candles count per asset.
     * GET /api/v1/candles/stats
     */
    public function stats()
    {
        $stats = Candle::selectRaw('asset, COUNT(*) as total, 
                                    SUM(CASE WHEN color = "G" THEN 1 ELSE 0 END) as greens,
                                    SUM(CASE WHEN color = "R" THEN 1 ELSE 0 END) as reds')
                       ->groupBy('asset')
                       ->orderByDesc('total')
                       ->get();

        return response()->json([
            'status' => 'ok',
            'data'   => $stats,
        ]);
    }
}
