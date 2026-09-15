<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Bot - Pattern Alert</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        green: { 500: '#22c55e', 600: '#16a34a' },
                        red:   { 500: '#ef4444', 600: '#dc2626' },
                    }
                }
            }
        }
    </script>
    @livewireStyles
</head>
<body class="bg-gray-950 text-white min-h-screen">

    {{-- Navbar --}}
    <nav class="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-2">
                <span class="text-2xl">🤖</span>
                <span class="font-bold text-lg text-white">Trading Bot</span>
                <span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">LIVE</span>
            </div>
            <div class="flex gap-1">
                <a href="{{ route('dashboard') }}"
                   class="px-4 py-2 rounded-lg text-sm font-medium transition
                          {{ request()->routeIs('dashboard') ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800' }}">
                    📊 Monitor
                </a>
                <a href="{{ route('patterns.index') }}"
                   class="px-4 py-2 rounded-lg text-sm font-medium transition
                          {{ request()->routeIs('patterns.*') ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800' }}">
                    🧩 Patterns
                </a>
                <a href="{{ route('alerts.index') }}"
                   class="px-4 py-2 rounded-lg text-sm font-medium transition
                          {{ request()->routeIs('alerts.*') ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800' }}">
                    🔔 Alerts
                </a>
            </div>
        </div>
    </nav>

    {{-- Main Content --}}
    <main class="max-w-6xl mx-auto px-4 py-6">
        {{ $slot }}
    </main>

    @livewireScripts
</body>
</html>
