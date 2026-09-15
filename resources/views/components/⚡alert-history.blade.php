<?php

use Livewire\Component;
use Livewire\Attributes\Layout;
use App\Models\Alert;

new #[Layout('layouts.app')] class extends Component
{
    public function render()
    {
        $alerts = Alert::with('pattern')
            ->latest('matched_at')
            ->paginate(20);

        return view('livewire.alert-history', compact('alerts'));
    }
};
?>

<div>
    {{-- Header --}}
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-white">🔔 Alert History</h1>
        <p class="text-gray-400 text-sm mt-1">Saare past alerts yahan dikhenge</p>
    </div>

    @if($alerts->isEmpty())
        <div class="text-center py-20 text-gray-500">
            <div class="text-5xl mb-4">🔕</div>
            <p class="text-lg">Abhi koi alert nahi aya</p>
            <p class="text-sm mt-1">Jab pattern match hoga, yahan dikhega</p>
        </div>
    @else
        <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table class="w-full text-sm">
                <thead class="bg-gray-800 text-gray-400">
                    <tr>
                        <th class="text-left px-4 py-3">Pattern</th>
                        <th class="text-left px-4 py-3">Asset</th>
                        <th class="text-left px-4 py-3">Time</th>
                        <th class="text-left px-4 py-3">Telegram</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                    @foreach($alerts as $alert)
                        <tr class="hover:bg-gray-800/50 transition">
                            <td class="px-4 py-3 text-white font-medium">
                                {{ $alert->pattern->name ?? '—' }}
                                <div class="text-xs text-gray-500 mt-0.5">
                                    @if($alert->pattern)
                                        {{ $alert->pattern->sequenceEmoji() }}
                                    @endif
                                </div>
                            </td>
                            <td class="px-4 py-3 text-gray-300">💱 {{ $alert->asset }}</td>
                            <td class="px-4 py-3 text-gray-400">
                                <div>{{ \Carbon\Carbon::parse($alert->matched_at)->format('d M, h:i A') }}</div>
                                <div class="text-xs text-gray-600">{{ \Carbon\Carbon::parse($alert->matched_at)->diffForHumans() }}</div>
                            </td>
                            <td class="px-4 py-3">
                                <span class="text-xs px-2 py-1 rounded-full
                                             {{ $alert->telegram_sent
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-yellow-500/20 text-yellow-400' }}">
                                    {{ $alert->telegram_sent ? '✅ Sent' : '⏳ Pending' }}
                                </span>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
            <div class="px-4 py-3 border-t border-gray-800">
                {{ $alerts->links() }}
            </div>
        </div>
    @endif
</div>