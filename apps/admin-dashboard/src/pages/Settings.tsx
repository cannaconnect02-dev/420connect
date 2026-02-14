import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, Save, RefreshCw, AlertCircle, Truck } from 'lucide-react';

export default function Settings() {
    const [markup, setMarkup] = useState<number>(20);
    // Delivery Settings
    const [baseRate, setBaseRate] = useState<number>(30);
    const [threshold, setThreshold] = useState<number>(5);
    const [extendedRate, setExtendedRate] = useState<number>(2.5);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('key, value')
                .in('key', ['global_markup_percent', 'delivery_base_rate', 'delivery_threshold_km', 'delivery_extended_price']);

            if (error) {
                console.error('Error fetching settings:', error);
            }

            if (data) {
                data.forEach(setting => {
                    switch (setting.key) {
                        case 'global_markup_percent':
                            setMarkup(Number(setting.value?.percent || 20));
                            break;
                        case 'delivery_base_rate':
                            setBaseRate(Number(setting.value?.amount || 30));
                            break;
                        case 'delivery_threshold_km':
                            setThreshold(Number(setting.value?.km || 5));
                            break;
                        case 'delivery_extended_price':
                            setExtendedRate(Number(setting.value?.rate || 2.5));
                            break;
                    }
                });
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMarkup = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    key: 'global_markup_percent',
                    value: { percent: markup }
                }, { onConflict: 'key' });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Markup settings saved successfully.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to save markup settings.' });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveDelivery = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const updates = [
                { key: 'delivery_base_rate', value: { amount: baseRate } },
                { key: 'delivery_threshold_km', value: { km: threshold } },
                { key: 'delivery_extended_price', value: { rate: extendedRate } }
            ];

            const { error } = await supabase
                .from('settings')
                .upsert(updates, { onConflict: 'key' });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Delivery settings saved successfully.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to save delivery settings.' });
        } finally {
            setSaving(false);
        }
    };

    const handleRecalculate = async () => {
        if (!confirm("This will update prices for ALL products based on the current markup. Continue?")) return;

        setRecalculating(true);
        setMessage(null);

        try {
            // First save the current markup
            await handleSaveMarkup();

            // Call the RPC function
            const { data, error } = await supabase.rpc('recalculate_all_product_prices');

            if (error) throw error;

            setMessage({ type: 'success', text: `Prices recalculated successfully. Updated ${data} products.` });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to recalculate prices.' });
        } finally {
            setRecalculating(false);
        }
    };

    const calculateFee = (km: number) => {
        if (km <= threshold) return baseRate;
        return baseRate + ((km - threshold) * extendedRate);
    };

    if (loading) {
        return <div className="text-white">Loading settings...</div>;
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <SettingsIcon className="w-8 h-8 text-blue-500" />
                        System Settings
                    </h1>
                    <p className="text-slate-400">Manage global configuration</p>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 max-w-2xl ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    <AlertCircle size={20} />
                    {message.text}
                </div>
            )}

            {/* Markup Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl">
                <div className="flex items-center gap-2 mb-6 text-blue-400 pb-2 border-b border-slate-800">
                    <SettingsIcon className="w-5 h-5" />
                    <h2 className="text-xl font-semibold text-white">Global Pricing Markup</h2>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-slate-300 mb-2 font-medium">
                            Global Markup Percentage (%)
                        </label>
                        <p className="text-sm text-slate-500 mb-4">
                            Added to merchant base price.
                            <br />
                            Formula: <code>Final = ceil((Base + (Base * Markup/100)) / 5) * 5</code>
                        </p>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                value={markup}
                                onChange={(e) => setMarkup(Number(e.target.value))}
                                min="0"
                                max="1000"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white w-32 focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-slate-400">%</span>
                        </div>

                        {/* Pricing Examples */}
                        <div className="mt-6 p-4 bg-slate-950/50 rounded border border-slate-800">
                            <h4 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider">Pricing Examples</h4>
                            <div className="space-y-3">
                                {[50, 123, 200].map((price) => {
                                    const withMarkup = price + (price * markup / 100);
                                    const final = Math.ceil(withMarkup / 5) * 5;
                                    return (
                                        <div key={price} className="flex justify-between items-center text-sm border-b border-slate-800 last:border-0 pb-2 last:pb-0">
                                            <span className="text-slate-300">Base Price: <span className="text-white font-medium">R{price}</span></span>
                                            <div className="text-right">
                                                <span className="block text-white font-bold">R{final.toFixed(2)}</span>
                                                <span className="text-xs text-slate-500">
                                                    (R{withMarkup.toFixed(2)} rounded up)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800 flex items-center gap-4">
                        <button
                            onClick={handleSaveMarkup}
                            disabled={saving || recalculating}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? (
                                <RefreshCw className="animate-spin w-5 h-5" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Save Markup
                        </button>

                        <button
                            onClick={handleRecalculate}
                            disabled={saving || recalculating}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-50 border border-slate-700"
                        >
                            {recalculating ? (
                                <RefreshCw className="animate-spin w-5 h-5" />
                            ) : (
                                <RefreshCw className="w-5 h-5" />
                            )}
                            Recalculate All Prices
                        </button>
                    </div>
                </div>
            </div>

            {/* Delivery Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl">
                <div className="flex items-center gap-2 mb-6 text-green-400 pb-2 border-b border-slate-800">
                    <Truck className="w-5 h-5" />
                    <h2 className="text-xl font-semibold text-white">Delivery Configuration</h2>
                </div>

                <div className="space-y-6">
                    <div className="space-y-6 bg-slate-950/30 p-4 rounded-lg border border-slate-800">
                        {/* Base Rate */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-slate-300 font-medium">Base Rate (R)</label>
                                <span className="text-white font-bold">R{baseRate.toFixed(2)}</span>
                            </div>
                            <div className="flex gap-4 items-center">
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="5"
                                    value={baseRate}
                                    onChange={(e) => setBaseRate(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <input
                                    type="number"
                                    value={baseRate}
                                    onChange={(e) => setBaseRate(Number(e.target.value))}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white w-20 text-center"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Flat rate charged for deliveries within the threshold.</p>
                        </div>

                        {/* Threshold Distance */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-slate-300 font-medium">Threshold Distance (km)</label>
                                <span className="text-white font-bold">{threshold} km</span>
                            </div>
                            <div className="flex gap-4 items-center">
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    step="1"
                                    value={threshold}
                                    onChange={(e) => setThreshold(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <input
                                    type="number"
                                    value={threshold}
                                    onChange={(e) => setThreshold(Number(e.target.value))}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white w-20 text-center"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Distance up to which only the base rate applies.</p>
                        </div>

                        {/* Extended Rate */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-slate-300 font-medium">Extended Rate (per km)</label>
                                <span className="text-white font-bold">R{extendedRate.toFixed(2)} / km</span>
                            </div>
                            <div className="flex gap-4 items-center">
                                <input
                                    type="range"
                                    min="0.5"
                                    max="10"
                                    step="0.5"
                                    value={extendedRate}
                                    onChange={(e) => setExtendedRate(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <input
                                    type="number"
                                    value={extendedRate}
                                    onChange={(e) => setExtendedRate(Number(e.target.value))}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white w-20 text-center"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Additional charge per km beyond the threshold.</p>
                        </div>

                        {/* Live Preview */}
                        <div className="mt-6 p-4 bg-slate-900 rounded border border-slate-700">
                            <h4 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider">Cost Examples</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">Short Trip (3 km)</span>
                                    <div className="text-right">
                                        <span className="block text-white font-bold">R{calculateFee(3).toFixed(2)}</span>
                                        <span className="text-xs text-slate-500">Base Rate Only</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-3">
                                    <span className="text-slate-300">Medium Trip (8 km)</span>
                                    <div className="text-right">
                                        <span className="block text-white font-bold">R{calculateFee(8).toFixed(2)}</span>
                                        <span className="text-xs text-slate-500">
                                            R{baseRate} + ({8 - threshold}km × R{extendedRate})
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-3">
                                    <span className="text-slate-300">Long Trip (15 km)</span>
                                    <div className="text-right">
                                        <span className="block text-white font-bold">R{calculateFee(15).toFixed(2)}</span>
                                        <span className="text-xs text-slate-500">
                                            R{baseRate} + ({15 - threshold}km × R{extendedRate})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800 flex items-center gap-4">
                        <button
                            onClick={handleSaveDelivery}
                            disabled={saving || recalculating}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? (
                                <RefreshCw className="animate-spin w-5 h-5" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Save Delivery Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
