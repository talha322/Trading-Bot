<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Currency;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        Currency::truncate();

        $names = [
            'GBP/JPY (OTC)', 'NZD/CAD (OTC)', 'USD/PKR (OTC)', 'AUD/CAD (OTC)',
            'AUD/CHF (OTC)', 'USD/BRL (OTC)', 'GBP/CAD (OTC)', 'NZD/JPY (OTC)',
            'USD/CHF (OTC)', 'USD/PHP (OTC)', 'USD/EGP (OTC)', 'USD/MXN (OTC)',
            'AUD/NZD (OTC)', 'GBP/AUD (OTC)', 'GBP/CHF (OTC)', 'USD/ARS (OTC)',
            'USD/CAD (OTC)', 'CAD/JPY (OTC)', 'AUD/JPY (OTC)', 'NZD/CHF (OTC)',
            'EUR/AUD (OTC)', 'CAD/CHF (OTC)', 'EUR/CAD (OTC)', 'USD/COP (OTC)',
            'EUR/JPY (OTC)', 'USD/INR (OTC)', 'AUD/USD (OTC)', 'CHF/JPY (OTC)',
            'EUR/CHF (OTC)', 'EUR/GBP (OTC)', 'EUR/USD (OTC)', 'USD/DZD (OTC)',
            'USD/IDR (OTC)', 'USD/JPY (OTC)', 'NZD/USD (OTC)', 'EUR/NZD (OTC)',
            'GBP/NZD (OTC)', 'USD/ZAR (OTC)', 'GBP/USD (OTC)',
            'BTC/USD (OTC)', 'ETH/USD (OTC)',
            'Gold/USD (OTC)', 'Silver/USD (OTC)',
        ];

        Currency::insert(array_map(fn($n) => ['name' => $n, 'created_at' => now(), 'updated_at' => now()], $names));
    }
}
