<?php

use Livewire\Component;
use Livewire\Attributes\Layout;
use App\Models\Pattern;

new #[Layout('layouts.app')] class extends Component
{
    // Pattern form fields
    public string $name = '';
    public string $asset = 'EURUSD';
    public int $timeframe = 1;
    public array $sequence = []; // e.g. ['G','R','R','R','R','R','R','R']

    // Edit mode
    public ?int $editingId = null;

    // UI state
    public bool $showForm = false;
    public string $successMessage = '';

    public array $assets = [
        'EURUSD'  => '🇪🇺 EUR/USD',
        'GBPUSD'  => '🇬🇧 GBP/USD',
        'USDJPY'  => '🇯🇵 USD/JPY',
        'AUDUSD'  => '🇦🇺 AUD/USD',
        'USDCAD'  => '🇨🇦 USD/CAD',
        'EURJPY'  => '🇪🇺 EUR/JPY',
        'GBPJPY'  => '🇬🇧 GBP/JPY',
        'BTCUSD'  => '₿ BTC/USD',
        'ETHUSD'  => '⟠ ETH/USD',
        'XAUUSD'  => '🥇 Gold/USD',
    ];

    public array $timeframes = [
        1  => '1 Minute',
        5  => '5 Minutes',
        15 => '15 Minutes',
    ];

    // Candle add karo sequence mein
    public function addCandle(string $color): void
    {
        if (count($this->sequence) < 20) {
            $this->sequence[] = $color; // 'G' ya 'R'
        }
    }

    // Last candle hataao
    public function removeLastCandle(): void
    {
        array_pop($this->sequence);
    }

    // Poora sequence clear karo
    public function clearSequence(): void
    {
        $this->sequence = [];
    }

    // Pattern save karo
    public function savePattern(): void
    {
        $this->validate([
            'name'     => 'required|min:2|max:100',
            'asset'    => 'required',
            'timeframe'=> 'required|integer',
            'sequence' => 'required|array|min:2',
        ], [
            'name.required'     => 'Pattern ka naam zaroori hai',
            'sequence.min'      => 'Kam se kam 2 candles add karo',
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

    // Edit mode
    public function editPattern(int $id): void
    {
        $pattern = Pattern::findOrFail($id);
        $this->editingId  = $id;
        $this->name       = $pattern->name;
        $this->asset      = $pattern->asset;
        $this->timeframe  = $pattern->timeframe;
        $this->sequence   = $pattern->sequence;
        $this->showForm   = true;
    }

    // Delete
    public function deletePattern(int $id): void
    {
        Pattern::findOrFail($id)->delete();
        $this->successMessage = '🗑️ Pattern delete ho gaya!';
    }

    // Toggle active/inactive
    public function toggleActive(int $id): void
    {
        $pattern = Pattern::findOrFail($id);
        $pattern->update(['is_active' => !$pattern->is_active]);
    }

    // Form reset
    public function resetForm(): void
    {
        $this->name       = '';
        $this->asset      = 'EURUSD';
        $this->timeframe  = 1;
        $this->sequence   = [];
        $this->editingId  = null;
        $this->showForm   = false;
    }

    public function render()
    {
        return view('livewire.pattern-builder', [
            'patterns' => Pattern::latest()->get(),
        ]);
    }
};
?>

<div>
    {{-- Header --}}
    <div class="flex items-center justify-between mb-6">
        <div>
            <h1 class="text-2xl font-bold text-white">🧩 Pattern Builder</h1>
            <p class="text-gray-400 text-sm mt-1">Apne candle patterns banao aur save karo</p>
        </div>
        <button wire:click="$set('showForm', true)"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2">
            <span>➕</span> Naya Pattern
        </button>
    </div>

    {{-- Success Message --}}
    @if($successMessage)
        <div class="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-4"
             x-data x-init="setTimeout(() => $wire.set('successMessage', ''), 3000)">
            {{ $successMessage }}
        </div>
    @endif

    {{-- Pattern Form --}}
    @if($showForm)
        <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
            <h2 class="text-lg font-semibold mb-4">
                {{ $editingId ? '✏️ Pattern Edit Karo' : '➕ Naya Pattern Banao' }}
            </h2>

            {{-- Name + Asset + Timeframe --}}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label class="block text-sm text-gray-400 mb-1">Pattern ka Naam</label>
                    <input wire:model="name" type="text"
                           placeholder="e.g. 8 Red Strategy"
                           class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500">
                    @error('name') <span class="text-red-400 text-xs">{{ $message }}</span> @enderror
                </div>
                <div>
                    <label class="block text-sm text-gray-400 mb-1">Asset (Currency)</label>
                    <select wire:model="asset"
                            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                        @foreach($assets as $value => $label)
                            <option value="{{ $value }}">{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-sm text-gray-400 mb-1">Timeframe</label>
                    <select wire:model="timeframe"
                            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                        @foreach($timeframes as $value => $label)
                            <option value="{{ $value }}">{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
            </div>

            {{-- Candle Sequence Builder --}}
            <div class="mb-6">
                <label class="block text-sm text-gray-400 mb-3">
                    Candle Sequence
                    <span class="text-gray-500 ml-2">({{ count($sequence) }}/20 candles)</span>
                </label>

                {{-- Sequence Display --}}
                <div class="flex flex-wrap gap-2 min-h-[60px] bg-gray-800 rounded-lg p-3 mb-3 border border-gray-700">
                    @if(empty($sequence))
                        <span class="text-gray-500 text-sm self-center">Neeche buttons se candles add karo...</span>
                    @else
                        @foreach($sequence as $i => $candle)
                            <div class="flex flex-col items-center gap-1">
                                <span class="text-xs text-gray-500">{{ $i + 1 }}</span>
                                <div class="w-10 h-14 rounded flex items-center justify-center text-xl font-bold
                                            {{ $candle === 'G' ? 'bg-green-500/20 border-2 border-green-500 text-green-400' : 'bg-red-500/20 border-2 border-red-500 text-red-400' }}">
                                    {{ $candle === 'G' ? '🟢' : '🔴' }}
                                </div>
                                <span class="text-xs {{ $candle === 'G' ? 'text-green-400' : 'text-red-400' }}">
                                    {{ $candle === 'G' ? 'BUY' : 'SELL' }}
                                </span>
                            </div>
                        @endforeach
                    @endif
                </div>
                @error('sequence') <span class="text-red-400 text-xs mb-2 block">{{ $message }}</span> @enderror

                {{-- Buttons --}}
                <div class="flex flex-wrap gap-2">
                    <button wire:click="addCandle('G')"
                            class="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold transition flex items-center gap-2">
                        🟢 Green (Bullish)
                    </button>
                    <button wire:click="addCandle('R')"
                            class="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-semibold transition flex items-center gap-2">
                        🔴 Red (Bearish)
                    </button>
                    <button wire:click="removeLastCandle"
                            class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg transition">
                        ↩ Undo
                    </button>
                    <button wire:click="clearSequence"
                            class="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2.5 rounded-lg transition">
                        🗑 Clear
                    </button>
                </div>
            </div>

            {{-- Form Actions --}}
            <div class="flex gap-3">
                <button wire:click="savePattern"
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition">
                    💾 Save Pattern
                </button>
                <button wire:click="resetForm"
                        class="bg-gray-700 hover:bg-gray-600 text-gray-300 px-6 py-2.5 rounded-lg transition">
                    Cancel
                </button>
            </div>
        </div>
    @endif

    {{-- Saved Patterns List --}}
    @if($patterns->isEmpty())
        <div class="text-center py-16 text-gray-500">
            <div class="text-5xl mb-4">🧩</div>
            <p class="text-lg">Abhi koi pattern nahi hai</p>
            <p class="text-sm mt-1">Upar "Naya Pattern" button se banao</p>
        </div>
    @else
        <div class="grid gap-4">
            @foreach($patterns as $pattern)
                <div class="bg-gray-900 border {{ $pattern->is_active ? 'border-gray-700' : 'border-gray-800 opacity-60' }} rounded-xl p-5">
                    <div class="flex items-start justify-between gap-4">
                        {{-- Pattern Info --}}
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <h3 class="font-semibold text-white text-lg">{{ $pattern->name }}</h3>
                                <span class="text-xs px-2 py-0.5 rounded-full
                                             {{ $pattern->is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-700 text-gray-400' }}">
                                    {{ $pattern->is_active ? '● Active' : '○ Inactive' }}
                                </span>
                            </div>
                            <div class="flex items-center gap-4 text-sm text-gray-400 mb-3">
                                <span>💱 {{ $pattern->asset }}</span>
                                <span>⏱ {{ $pattern->timeframe }} min</span>
                                <span>📊 {{ count($pattern->sequence) }} candles</span>
                            </div>
                            {{-- Sequence Emoji --}}
                            <div class="flex flex-wrap gap-1">
                                @foreach($pattern->sequence as $i => $candle)
                                    <span class="inline-flex flex-col items-center">
                                        <span class="text-xs text-gray-600">{{ $i+1 }}</span>
                                        <span class="w-8 h-10 rounded flex items-center justify-center
                                                     {{ $candle === 'G' ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50' }}">
                                            {{ $candle === 'G' ? '🟢' : '🔴' }}
                                        </span>
                                    </span>
                                @endforeach
                            </div>
                        </div>

                        {{-- Actions --}}
                        <div class="flex flex-col gap-2">
                            <button wire:click="toggleActive({{ $pattern->id }})"
                                    class="text-xs px-3 py-1.5 rounded-lg transition
                                           {{ $pattern->is_active ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30' }}">
                                {{ $pattern->is_active ? '⏸ Pause' : '▶ Activate' }}
                            </button>
                            <button wire:click="editPattern({{ $pattern->id }})"
                                    class="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition">
                                ✏️ Edit
                            </button>
                            <button wire:click="deletePattern({{ $pattern->id }})"
                                    wire:confirm="Pattern delete karna chahte ho?"
                                    class="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">
                                🗑 Delete
                            </button>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    @endif
</div>