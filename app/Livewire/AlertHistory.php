<?php

namespace App\Livewire;

use Livewire\Component;
use Livewire\WithPagination;
use App\Models\Alert;

class AlertHistory extends Component
{
    use WithPagination;

    public function render()
    {
        $alerts = Alert::with('pattern')->latest('matched_at')->paginate(20);

        return view('livewire.alert-history', compact('alerts'))
            ->layout('layouts.app');
    }
}
