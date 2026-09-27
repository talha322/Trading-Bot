<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Bot Dashboard</title>
    @livewireStyles
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #0d1117;
            color: #e6edf3;
            min-height: 100vh;
        }

        /* ── Header ── */
        .header {
            background: #161b22;
            border-bottom: 1px solid #21262d;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .header-logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header-logo .dot {
            width: 12px; height: 12px;
            border-radius: 50%;
            background: #3fb950;
            box-shadow: 0 0 8px #3fb950;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
        .header-logo h1 { font-size: 18px; font-weight: 600; color: #e6edf3; }
        .header-logo span { font-size: 12px; color: #8b949e; }
        .header-time { font-size: 13px; color: #8b949e; }

        /* ── Layout ── */
        .container { max-width: 1200px; margin: 0 auto; padding: 24px; }

        /* ── Stat Cards ── */
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .stat-card {
            background: #161b22;
            border: 1px solid #21262d;
            border-radius: 8px;
            padding: 20px;
        }
        .stat-card .label { font-size: 12px; color: #8b949e; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-card .value { font-size: 32px; font-weight: 700; color: #e6edf3; }
        .stat-card .value.green { color: #3fb950; }
        .stat-card .value.yellow { color: #d29922; }

        /* ── Tabs ── */
        .tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid #21262d; }
        .tab-btn {
            padding: 10px 20px;
            background: none;
            border: none;
            color: #8b949e;
            cursor: pointer;
            font-size: 14px;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
            transition: all 0.2s;
        }
        .tab-btn:hover { color: #e6edf3; }
        .tab-btn.active { color: #58a6ff; border-bottom-color: #58a6ff; }

        /* ── Table ── */
        .card {
            background: #161b22;
            border: 1px solid #21262d;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .card-header {
            padding: 16px 20px;
            border-bottom: 1px solid #21262d;
            font-size: 14px;
            font-weight: 600;
            color: #8b949e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        table { width: 100%; border-collapse: collapse; }
        th {
            text-align: left;
            padding: 12px 20px;
            font-size: 11px;
            color: #8b949e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #21262d;
        }
        td { padding: 12px 20px; font-size: 13px; border-bottom: 1px solid #161b22; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #1c2128; }

        /* ── Badges ── */
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
        }
        .badge-green { background: rgba(63,185,80,0.15); color: #3fb950; border: 1px solid rgba(63,185,80,0.3); }
        .badge-red   { background: rgba(248,81,73,0.15);  color: #f85149; border: 1px solid rgba(248,81,73,0.3); }

        /* ── Win Rate Bar ── */
        .win-bar-wrap { display: flex; align-items: center; gap: 8px; }
        .win-bar { height: 6px; background: #21262d; border-radius: 3px; flex: 1; }
        .win-bar-fill { height: 100%; border-radius: 3px; }
        .win-bar-pct { font-size: 12px; color: #8b949e; min-width: 35px; text-align: right; }

        /* ── Empty state ── */
        .empty { text-align: center; padding: 60px 20px; color: #8b949e; }
        .empty .icon { font-size: 40px; margin-bottom: 12px; }
        .empty p { font-size: 14px; }

        /* ── No wrap ── */
        .nowrap { white-space: nowrap; }

        /* ── Pagination ── */
        .pagination-wrap {
            padding: 14px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid #21262d;
            background: #161b22;
            flex-wrap: wrap;
            gap: 10px;
        }
        .pagination-btn {
            padding: 6px 14px;
            border-radius: 6px;
            background: #21262d;
            color: #e6edf3;
            border: 1px solid #30363d;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
        }
        .pagination-btn:hover:not(:disabled) { background: #30363d; border-color: #58a6ff; color: #58a6ff; }
        .pagination-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pagination-info { font-size: 12px; color: #8b949e; }
    </style>
</head>
<body>

<div class="header">
    <div class="header-logo">
        <div class="dot"></div>
        <div>
            <h1>Trading Bot Dashboard</h1>
            <span>Live Data Collection Monitor</span>
        </div>
    </div>
    <div class="header-time" id="clock"></div>
</div>

<div class="container">
    {{ $slot }}
</div>

@livewireScripts

<script>
    function updateClock() {
        const now = new Date();
        document.getElementById('clock').textContent = now.toLocaleTimeString('en-PK', {
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
    setInterval(updateClock, 1000);
    updateClock();
</script>

</body>
</html>
