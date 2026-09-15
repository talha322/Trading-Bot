<?php

namespace App\Livewire;

use Livewire\Component;
use App\Models\Pattern;
use App\Models\Alert;

class MonitorDashboard extends Component
{
    public string $status = 'idle';
    public string $lastChecked = '';

    public function refresh(): void
    {
        $this->lastChecked = now()->format('h:i:s A');
    }

    public function render()
    {
        $activeCount  = Pattern::where('is_active', true)->count();
        $totalAlerts  = Alert::count();
        $todayAlerts  = Alert::whereDate('matched_at', today())->count();
        $recentAlerts = Alert::with('pattern')->latest()->take(5)->get();

        return view('livewire.monitor-dashboard', compact('activeCount', 'totalAlerts', 'todayAlerts', 'recentAlerts'))
            ->layout('layouts.app');
    }
}
