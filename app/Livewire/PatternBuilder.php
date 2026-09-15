<?php

namespace App\Livewire;

use Livewire\Component;
use App\Models\Pattern;
use App\Models\Currency;

class PatternBuilder extends Component
{
    public string $name = '';
    public string $asset = '';
    public int $timeframe = 1;
    public array $sequence = [];
    public ?int $editingId = null;
    public bool $showForm = false;
    public string $successMessage = '';




    public array $timeframes = [
        1  => '1 Minute',
        5  => '5 Minutes',
        15 => '15 Minutes',
    ];

    public function addCandle(string $color): void
    {
        if (count($this->sequence) < 20) {
            $this->sequence[] = $color;
        }
    }

    public function removeLastCandle(): void
    {
        array_pop($this->sequence);
    }

    public function clearSequence(): void
    {
        $this->sequence = [];
    }

    public function savePattern(): void
    {
        $this->validate([
            'name'      => 'required|min:2|max:100',
            'asset'     => 'required',
            'timeframe' => 'required|integer',
            'sequence'  => 'required|array|min:2',
        ], [
            'name.required'  => 'Pattern ka naam zaroori hai',
            'sequence.min'   => 'Kam se kam 2 candles add karo',
        ]);

        if ($this->editingId) {
            Pattern::find($this->editingId)->update([
                'name'      => $this->name,
                'asset'     => $this->asset,
                'timeframe' => $this->timeframe,
                'sequence'  => $this->sequence,
            ]);
            $this->successMessage = '✅ Pattern update ho gaya!';
        } else {
            Pattern::create([
                'name'      => $this->name,
                'asset'     => $this->asset,
                'timeframe' => $this->timeframe,
                'sequence'  => $this->sequence,
            ]);
            $this->successMessage = '✅ Pattern save ho gaya!';
        }

        $this->resetForm();
    }

    public function editPattern(int $id): void
    {
        $pattern          = Pattern::findOrFail($id);
        $this->editingId  = $id;
        $this->name       = $pattern->name;
        $this->asset      = $pattern->asset;
        $this->timeframe  = $pattern->timeframe;
        $this->sequence   = $pattern->sequence;
        $this->showForm   = true;
    }

    public function deletePattern(int $id): void
    {
        Pattern::findOrFail($id)->delete();
        $this->successMessage = '🗑️ Pattern delete ho gaya!';
    }

    public function toggleActive(int $id): void
    {
        $pattern = Pattern::findOrFail($id);
        $pattern->update(['is_active' => !$pattern->is_active]);
    }

    public function resetForm(): void
    {
        $this->name      = '';
        $this->asset     = 'EURUSD';
        $this->timeframe = 1;
        $this->sequence  = [];
        $this->editingId = null;
        $this->showForm  = false;
    }

    public function render()
    {
        return view('livewire.pattern-builder', [
            'patterns'   => Pattern::latest()->get(),
            'currencies' => Currency::pluck('name'),
        ])->layout('layouts.app');
    }
}
