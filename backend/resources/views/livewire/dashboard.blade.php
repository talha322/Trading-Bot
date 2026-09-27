<div>

    {{-- ── Stat Cards ── --}}
    <div class="stat-grid">
        <div class="stat-card">
            <div class="label">Total Candles</div>
            <div class="value green">{{ number_format($totalCandles) }}</div>
        </div>
        <div class="stat-card">
            <div class="label">Assets Tracked</div>
            <div class="value">{{ $totalAssets }}</div>
        </div>
        <div class="stat-card">
            <div class="label">Today's Candles</div>
            <div class="value yellow">{{ $todayCandles }}</div>
        </div>
        <div class="stat-card">
            <div class="label">Status</div>
            <div class="value" style="font-size:15px; padding-top:6px; display:flex; align-items:center; gap:6px;">
                @if($totalCandles > 0)
                    <span style="color:#3fb950;">● Connected</span>
                @else
                    <span style="color:#8b949e;">● Waiting for data...</span>
                @endif
            </div>
        </div>
    </div>

    {{-- ── Tabs ── --}}
    <div class="tabs">
        <button class="tab-btn {{ $activeTab === 'overview' ? 'active' : '' }}"
                wire:click="setTab('overview')">
            📊 Overview
        </button>
        <button class="tab-btn {{ $activeTab === 'logs' ? 'active' : '' }}"
                wire:click="setTab('logs')">
            📋 Candle Logs
        </button>
        <button class="tab-btn {{ $activeTab === 'hourly' ? 'active' : '' }}"
                wire:click="setTab('hourly')">
            🕐 Hourly Stats
        </button>
    </div>

    {{-- ══════ TAB: Overview ══════ --}}
    @if($activeTab === 'overview')

        @if($assetStats->isEmpty())
            <div class="card">
                <div class="empty">
                    <div class="icon">📡</div>
                    <p>Koi data nahi mila abhi tak.</p>
                    <p style="margin-top:8px; font-size:12px;">Extension mein Data Collection ON karo aur bot start karo.</p>
                </div>
            </div>
        @else
            <div class="card">
                <div class="card-header">Asset Breakdown</div>
                <table>
                    <thead>
                        <tr>
                            <th>Asset</th>
                            <th>Total Candles</th>
                            <th>🟢 Green</th>
                            <th>🔴 Red</th>
                            <th>Green Win Rate</th>
                            <th>Red Win Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($assetStats as $stat)
                            @php
                                $greenPct = $stat->total > 0 ? round(($stat->greens / $stat->total) * 100) : 0;
                                $redPct   = 100 - $greenPct;
                            @endphp
                            <tr>
                                <td><strong>{{ $stat->asset }}</strong></td>
                                <td>{{ number_format($stat->total) }}</td>
                                <td><span class="badge badge-green">{{ $stat->greens }}</span></td>
                                <td><span class="badge badge-red">{{ $stat->reds }}</span></td>
                                <td>
                                    <div class="win-bar-wrap">
                                        <div class="win-bar">
                                            <div class="win-bar-fill" style="width:{{ $greenPct }}%; background:#3fb950;"></div>
                                        </div>
                                        <span class="win-bar-pct">{{ $greenPct }}%</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="win-bar-wrap">
                                        <div class="win-bar">
                                            <div class="win-bar-fill" style="width:{{ $redPct }}%; background:#f85149;"></div>
                                        </div>
                                        <span class="win-bar-pct">{{ $redPct }}%</span>
                                    </div>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif

    {{-- ══════ TAB: Candle Logs ══════ --}}
    @elseif($activeTab === 'logs')

            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span>Candle Logs (Page {{ $latestCandles->currentPage() }})</span>
                <span style="font-size:12px; font-weight:normal; color:#8b949e;">50 candles per page • Total {{ number_format($latestCandles->total()) }}</span>
            </div>
            @if($latestCandles->isEmpty())
                <div class="empty">
                    <div class="icon">🕯️</div>
                    <p>Candle logs abhi empty hain.</p>
                </div>
            @else
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Asset</th>
                            <th>Color</th>
                            <th>Open</th>
                            <th>Close</th>
                            <th>Size</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($latestCandles as $i => $candle)
                        <tr>
                            <td style="color:#8b949e;">{{ $latestCandles->firstItem() + $i }}</td>
                            <td class="nowrap"><strong>{{ $candle->asset }}</strong></td>
                            <td>
                                @if($candle->color === 'G')
                                    <span class="badge badge-green">🟢 Green</span>
                                @else
                                    <span class="badge badge-red">🔴 Red</span>
                                @endif
                            </td>
                            <td class="nowrap" style="color:#8b949e; font-size:12px;">{{ $candle->open_price }}</td>
                            <td class="nowrap" style="color:#8b949e; font-size:12px;">{{ $candle->close_price }}</td>
                            <td style="color:#8b949e; font-size:12px;">
                                {{ $candle->candle_size ? number_format($candle->candle_size * 100, 4) . '%' : '-' }}
                            </td>
                            <td class="nowrap" style="color:#8b949e; font-size:12px;">
                                {{ \Carbon\Carbon::createFromTimestamp($candle->candle_time, 'Asia/Karachi')->format('d M, H:i') }}
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>

                @if($latestCandles->hasPages())
                    <div class="pagination-wrap">
                        <span class="pagination-info">
                            Showing {{ $latestCandles->firstItem() }} to {{ $latestCandles->lastItem() }} of {{ number_format($latestCandles->total()) }} candles
                        </span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="pagination-btn" wire:click="previousPage" @if($latestCandles->onFirstPage()) disabled @endif>
                                ← Previous
                            </button>
                            <span style="font-size: 13px; color: #8b949e; padding: 0 4px;">
                                Page <strong style="color:#e6edf3;">{{ $latestCandles->currentPage() }}</strong> of {{ $latestCandles->lastPage() }}
                            </span>
                            <button class="pagination-btn" wire:click="nextPage" @if(!$latestCandles->hasMorePages()) disabled @endif>
                                Next →
                            </button>
                        </div>
                    </div>
                @endif
            @endif
        </div>

    {{-- ══════ TAB: Hourly Stats ══════ --}}
    @elseif($activeTab === 'hourly')

        <div class="card">
            <div class="card-header">Hourly Candle Distribution (Last 7 Days)</div>
            @if($hourlyStats->isEmpty())
                <div class="empty">
                    <div class="icon">🕐</div>
                    <p>Hourly data abhi available nahi hai.</p>
                </div>
            @else
                <table>
                    <thead>
                        <tr>
                            <th>Hour (PKT)</th>
                            <th>Total</th>
                            <th>🟢 Green</th>
                            <th>🔴 Red</th>
                            <th>Green %</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($hourlyStats as $h)
                            @php
                                $gPct = $h->total > 0 ? round(($h->greens / $h->total) * 100) : 0;
                            @endphp
                            <tr>
                                <td class="nowrap">
                                    {{ str_pad($h->hour_of_day, 2, '0', STR_PAD_LEFT) }}:00 —
                                    {{ str_pad($h->hour_of_day + 1, 2, '0', STR_PAD_LEFT) }}:00
                                </td>
                                <td>{{ $h->total }}</td>
                                <td><span class="badge badge-green">{{ $h->greens }}</span></td>
                                <td><span class="badge badge-red">{{ $h->reds }}</span></td>
                                <td>
                                    <div class="win-bar-wrap">
                                        <div class="win-bar">
                                            <div class="win-bar-fill" style="width:{{ $gPct }}%; background:{{ $gPct >= 60 ? '#3fb950' : ($gPct >= 50 ? '#d29922' : '#f85149') }};"></div>
                                        </div>
                                        <span class="win-bar-pct">{{ $gPct }}%</span>
                                    </div>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </div>

    @endif

    <script>
        // ⚡ Extension jab candle save kare to dashboard ko usi waqt update karo
        window.addEventListener('candle-saved-event', () => {
            console.log('⚡ Realtime event received: candle saved! Refreshing dashboard...');
            if (typeof @this !== 'undefined') {
                @this.call('$refresh');
            }
        });

        // 🕒 Har minute ke rollover (:02s) par sync (sirf 1 dafa per minute)
        (function scheduleMinuteSync() {
            const now = new Date();
            const delay = ((60 - now.getSeconds() + 2) % 60) * 1000;
            setTimeout(() => {
                if (typeof @this !== 'undefined') {
                    @this.call('$refresh');
                }
                setInterval(() => {
                    if (typeof @this !== 'undefined') {
                        @this.call('$refresh');
                    }
                }, 60000);
            }, delay);
        })();
    </script>

</div>
