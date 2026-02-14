import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, Save, RefreshCw, AlertCircle } from 'lucide-react';

export default function Settings() {
    const [markup, setMarkup] = useState<number>(20);
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
                .select('value')
                .eq('key', 'global_markup_percent')
                .single();

            if (error) {
                // If not found, maybe it's not initialized or RLS issue, but we rely on migration
                console.error('Error fetching settings:', error);
            }

            if (data?.value?.percent) {
                setMarkup(Number(data.value.percent));
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
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

            setMessage({ type: 'success', text: 'Settings saved successfully.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to save settings.' });
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
            await handleSave();

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

    if (loading) {
        return <div className="text-white">Loading settings...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <SettingsIcon className="w-8 h-8 text-blue-500" />
                        System Settings
                    </h1>
                    <p className="text-slate-400">Manage global pricing and configuration</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl">
                <h2 className="text-xl font-semibold text-white mb-6">Pricing Configuration</h2>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        <AlertCircle size={20} />
                        {message.text}
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <label className="block text-slate-300 mb-2 font-medium">
                            Global Markup Percentage (%)
                        </label>
                        <p className="text-sm text-slate-500 mb-4">
                            This percentage is added to the merchant's base price to determine the final customer price.
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

                        {/* Example Calculation */}
                        <div className="mt-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                            <h3 className="text-sm font-semibold text-slate-300 mb-2">Example Calculation (Base Price R100):</h3>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-slate-400">Base Price:</span>
                                <span className="text-white font-medium">R100.00</span>
                                <span className="text-slate-500">+</span>
                                <span className="text-slate-400">Markup ({markup}%):</span>
                                <span className="text-blue-400 font-medium">R{(100 * (markup / 100)).toFixed(2)}</span>
                                <span className="text-slate-500">=</span>
                                <span className="text-slate-400">Total:</span>
                                <span className="text-white font-medium">R{(100 + (100 * (markup / 100))).toFixed(2)}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-sm border-t border-slate-800 pt-2">
                                <span className="text-slate-400">Customer Pays (Rounded Up):</span>
                                <span className="text-green-400 font-bold text-lg">
                                    R{(Math.ceil((100 + (100 * (markup / 100))) / 5) * 5).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800 flex items-center gap-4">
                        <button
                            onClick={handleSave}
                            disabled={saving || recalculating}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? (
                                <RefreshCw className="animate-spin w-5 h-5" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Save Settings
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
        </div>
    );
}
