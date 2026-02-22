import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Store, Loader, CreditCard, Building2, AlertCircle, Percent } from 'lucide-react';

interface StoreData {
    id: string;
    name: string;
    address: string;
    paystack_splitcode: string | null;
    paystack_split_percentage: number | null;
    paystack_subaccount_code: string | null;
}

interface BankDetails {
    business_name: string;
    settlement_bank: string;
    account_number: string;
    bank_id: string;
}

interface BankRecord {
    id: string;
    name: string;
    code: string;
}

export default function Stores() {
    const [stores, setStores] = useState<StoreData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
    const [banks, setBanks] = useState<BankRecord[]>([]);
    const [loadingBank, setLoadingBank] = useState(false);

    // Form state
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStores();
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        try {
            const { data, error } = await supabase
                .from('banks')
                .select('id, name, code')
                .eq('is_active', true)
                .order('name');
            if (error) throw error;
            setBanks(data || []);
        } catch (err) {
            console.error('Error fetching banks:', err);
        }
    };

    const fetchStores = async () => {
        try {
            const { data, error } = await supabase
                .from('stores')
                .select('id, name, address, paystack_splitcode, paystack_split_percentage, paystack_subaccount_code')
                .order('name');

            if (error) throw error;
            setStores(data || []);
        } catch (err) {
            console.error('Error fetching stores:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBankDetails = async (storeId: string) => {
        setLoadingBank(true);
        try {
            const { data, error } = await supabase
                .from('bank_details')
                .select('business_name, settlement_bank, account_number, bank_id')
                .eq('store_id', storeId)
                .maybeSingle();

            if (error) throw error;
            setBankDetails(data);
        } catch (err) {
            console.error('Error fetching bank details:', err);
        } finally {
            setLoadingBank(false);
        }
    };

    const handleSelectStore = async (store: StoreData) => {
        setSelectedStore(store);
        setError(null);
        setBankDetails(null); // Clear previous bank details
        fetchBankDetails(store.id);
    };

    const handleConfigureSplit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedStore) return;

        if (!bankDetails) {
            setError("Cannot configure split without store bank details. Please ask the merchant to update their bank information in the portal.");
            return;
        }

        setIsSaving(true);
        try {
            const { data, error: fnError } = await supabase.functions.invoke('paystack-subaccount', {
                body: {
                    store_id: selectedStore.id,
                    business_name: bankDetails.business_name,
                    settlement_bank: bankDetails.settlement_bank,
                    account_number: bankDetails.account_number,
                    subaccount_code: selectedStore.paystack_subaccount_code,
                    bank_id: bankDetails.bank_id
                }
            });

            if (fnError) {
                // Try to extract the actual error message from the response context
                let errorMessage = fnError.message || 'Unknown error from edge function';
                try {
                    // fnError.context may contain the response body as JSON
                    if (fnError.context && typeof fnError.context === 'object') {
                        const ctx = fnError.context as any;
                        if (ctx.body) {
                            const bodyText = await new Response(ctx.body).text();
                            const parsed = JSON.parse(bodyText);
                            errorMessage = parsed.error || parsed.message || errorMessage;
                        }
                    }
                } catch {
                    // If parsing fails, use the original message
                }
                throw new Error(errorMessage);
            }

            if (!data?.success) throw new Error(data?.error || "Failed to create/update subaccount");

            // Update local state to reflect the subaccount if it was new
            setStores(prev => prev.map(s =>
                s.id === selectedStore.id
                    ? { ...s, paystack_subaccount_code: data?.data?.subaccount_code || s.paystack_subaccount_code }
                    : s
            ));

            // Close the modal/form by clearing selection
            setSelectedStore(null);

            alert(`Successfully configured split for ${selectedStore.name}!`);

        } catch (err: any) {
            console.error('Error configuring split:', err);
            setError(err.message || "An unexpected error occurred while communicating with Paystack.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="text-slate-400 flex items-center justify-center h-64"><Loader className="animate-spin w-8 h-8" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Active Stores</h1>
                    <p className="text-slate-400">View stores and configure Paystack split payments</p>
                </div>
                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400">
                    {stores.length} Stores
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Store List */}
                <div className="lg:col-span-2 space-y-4">
                    {stores.length === 0 ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                            <Store className="w-8 h-8 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-white font-medium">No Active Stores</h3>
                            <p className="text-slate-500 text-sm mt-1">There are currently no stores in the system.</p>
                        </div>
                    ) : (
                        stores.map(store => (
                            <div
                                key={store.id}
                                className={`bg-slate-900 border rounded-xl p-6 transition-colors cursor-pointer ${selectedStore?.id === store.id ? 'border-green-500/50 bg-green-500/5' : 'border-slate-800 hover:border-slate-700'}`}
                                onClick={() => handleSelectStore(store)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            {store.name}
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-1">{store.address}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {store.paystack_subaccount_code ? (
                                            <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs px-2 py-1 rounded flex items-center gap-1">
                                                <Percent className="w-3 h-3" />
                                                Active Subaccount
                                            </span>
                                        ) : (
                                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs px-2 py-1 rounded">
                                                No Subaccount
                                            </span>
                                        )}
                                        <button
                                            className="h-8 px-3 rounded text-sm font-medium border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleSelectStore(store); }}>
                                            {store.paystack_subaccount_code ? 'Update Subaccount' : 'Create Subaccount'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Configuration Panel */}
                <div>
                    {selectedStore ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl sticky top-6 overflow-hidden">
                            <div className="p-6 border-b border-slate-800">
                                <h2 className="text-xl font-bold text-white mb-1">{selectedStore.name}</h2>
                                <p className="text-sm text-slate-400">Configure Paystack Subaccount Details</p>
                            </div>
                            <div className="p-6">
                                {loadingBank ? (
                                    <div className="flex justify-center p-6"><Loader className="animate-spin text-slate-400" /></div>
                                ) : !bankDetails ? (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-amber-400 text-sm flex gap-3">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <p>This store has not provided their bank details in the merchant portal yet. You cannot configure a subaccount without bank details.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleConfigureSplit} className="space-y-4">
                                        <div className="bg-slate-800/50 rounded-lg p-4 space-y-3 mb-4">
                                            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
                                                <Building2 className="w-4 h-4" />
                                                Store Bank Details
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <span className="text-slate-500">Business Name:</span>
                                                <span className="text-white font-medium">{bankDetails.business_name}</span>

                                                <span className="text-slate-500">Bank:</span>
                                                <span className="text-white font-medium">
                                                    {(() => {
                                                        const bank = banks.find(b => b.id === bankDetails.bank_id) || banks.find(b => b.code === bankDetails.settlement_bank);
                                                        return bank ? `${bank.name} (${bank.code})` : bankDetails.settlement_bank;
                                                    })()}
                                                </span>

                                                <span className="text-slate-500">Account No:</span>
                                                <span className="text-white font-medium flex items-center gap-1">
                                                    <CreditCard className="w-3 h-3 text-slate-400" />
                                                    {bankDetails.account_number}
                                                </span>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg p-3">
                                                {error}
                                            </div>
                                        )}

                                        {/* Reduced Configuration since dynamic charge logic overrides this percentage */}
                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                className="w-full h-10 rounded-md bg-green-500 hover:bg-green-400 transition-colors text-slate-950 font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <><Loader className="w-4 h-4 mr-2 animate-spin" /> Configuring with Paystack...</>
                                                ) : (
                                                    selectedStore.paystack_subaccount_code ? 'Update Subaccount' : 'Create Subaccount'
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center sticky top-6">
                            <Store className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <h3 className="text-slate-300 font-medium">Select a Store</h3>
                            <p className="text-slate-500 text-sm mt-1">Select a store from the list to view or configure their Paystack split payment details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
