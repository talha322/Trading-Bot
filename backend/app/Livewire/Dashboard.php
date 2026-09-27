<?php

namespace App\Livewire;

use App\Models\Candle;
use Livewire\Component;
use Livewire\Attributes\Url;
use Livewire\WithPagination;

class Dashboard extends Component
{
    use WithPagination;

    #[Url(as: 'tab', history: true)]
    public string $activeTab = 'overview';

    public function mount(): void
    {
        if (!request()->has('tab') && session()->has('dashboard_active_tab')) {
            $this->activeTab = session()->get('dashboard_active_tab');
        }
    }

    public function updatedActiveTab($value): void
    {
        session()->put('dashboard_active_tab', $value);
    }

    public function setTab(string $tab): void
    {
        $this->activeTab = $tab;
        session()->put('dashboard_active_tab', $tab);
    }

    public function render()
    {
        // --- Overview Stats ---
        $assetStats = Candle::selectRaw('
            asset,
            COUNT(*) as total,
            SUM(CASE WHEN color = "G" THEN 1 ELSE 0 END) as greens,
            SUM(CASE WHEN color = "R" THEN 1 ELSE 0 END) as reds
        ')->groupBy('asset')->orderByDesc('total')->get();

        $totalCandles  = Candle::count();
        $totalAssets   = Candle::distinct('asset')->count();
        $todayCandles  = Candle::whereDate('created_at', today())->count();
        $latestCandles = Candle::orderByDesc('candle_time')->paginate(50);

        // --- Hourly breakdown (last 7 days) ---
        $hourlyStats = Candle::selectRaw('
            hour_of_day,
            COUNT(*) as total,
            SUM(CASE WHEN color = "G" THEN 1 ELSE 0 END) as greens,
            SUM(CASE WHEN color = "R" THEN 1 ELSE 0 END) as reds
        ')->where('created_at', '>=', now()->subDays(7))
          ->groupBy('hour_of_day')
          ->orderBy('hour_of_day')
          ->get();

        return view('livewire.dashboard', compact(
            'assetStats',
            'totalCandles',
            'totalAssets',
            'todayCandles',
            'latestCandles',
            'hourlyStats',
        ))->layout('layouts.app');
    }
}
