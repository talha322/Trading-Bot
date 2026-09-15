<?php

use Illuminate\Support\Facades\Route;

Route::get('/', \App\Livewire\MonitorDashboard::class)->name('dashboard');
Route::get('/patterns', \App\Livewire\PatternBuilder::class)->name('patterns.index');
Route::get('/alerts', \App\Livewire\AlertHistory::class)->name('alerts.index');
