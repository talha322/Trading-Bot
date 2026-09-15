<div>
    {{-- Header --}}
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-white">📊 Live Monitor</h1>
        <p class="text-gray-400 text-sm mt-1">Har 30 second mein automatically check hota hai</p>
    </div>

    {{-- Stats Cards --}}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-blue-400">{{ $activeCount }}</div>
            <div class="text-xs text-gray-400 mt-1">Active Patterns</div>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-green-400">{{ $todayAlerts }}</div>
            <div class="text-xs text-gray-400 mt-1">Today's Alerts</div>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-yellow-400">{{ $totalAlerts }}</div>
            <div class="text-xs text-gray-400 mt-1">Total Alerts</div>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-purple-400">30s</div>
            <div class="text-xs text-gray-400 mt-1">Check Interval</div>
        </div>
    </div>

    {{-- Live Status --}}
    <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-white">⚡ Live Status</h2>
            @if($lastChecked)
                <span class="text-xs text-gray-500">Last check: {{ $lastChecked }}</span>
            @endif
        </div>
        <div class="flex items-center gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700">
            <div class="w-3 h-3 rounded-full bg-gray-500"></div>
            <span class="text-gray-400">
                {{ $activeCount > 0 ? '⏳ Monitoring... agla check 30 sec mein' : '⚠️ Koi active pattern nahi — pehle pattern banao' }}
            </span>
        </div>
    </div>

    {{-- Recent Alerts --}}
    <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-white">🔔 Recent Alerts</h2>
            <a href="{{ route('alerts.index') }}" class="text-xs text-blue-400 hover:underline">Sab dekho →</a>
        </div>
        @if($recentAlerts->isEmpty())
            <div class="text-center py-8 text-gray-500">
                <div class="text-3xl mb-2">🔕</div>
                <p class="text-sm">Abhi koi alert nahi aya</p>
            </div>
        @else
            <div class="space-y-3">
                @foreach($recentAlerts as $alert)
                    <div class="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                        <div>
                            <span class="font-medium text-white text-sm">{{ $alert->pattern->name ?? 'Unknown' }}</span>
                            <span class="text-gray-400 text-xs ml-2">💱 {{ $alert->asset }}</span>
                        </div>
                        <div class="text-right">
                            <div class="text-xs text-gray-400">{{ \Carbon\Carbon::parse($alert->matched_at)->diffForHumans() }}</div>
                        </div>
                    </div>
                @endforeach
            </div>
        @endif
    </div>
</div>
