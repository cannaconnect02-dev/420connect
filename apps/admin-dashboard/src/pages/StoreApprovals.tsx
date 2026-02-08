import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, Store, Loader } from 'lucide-react';

interface RoleRequest {
    id: string;
    user_id: string;
    role: string;
    status: string;
    requested_at: string;
    profiles: {
        full_name: string;
        email?: string;
        stores: {
            name: string;
            registration_number?: string;
            document_url?: string;
        }[];
    };
}

export default function StoreApprovals() {
    const [requests, setRequests] = useState<RoleRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('role_requests')
                .select(`
                    id,
                    user_id,
                    role,
                    status,
                    requested_at,
                    profiles:user_id (
                        full_name,
                        stores:owner_id (
                            name,
                            registration_number,
                            document_url
                        )
                    )
                `)
                .eq('status', 'pending')
                .eq('role', 'store_admin')
                .order('requested_at', { ascending: false });

            if (error) {
                throw error;
            }
            setRequests(data as any || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (requestId: string, status: 'approved' | 'rejected') => {
        setProcessing(requestId);
        try {
            // Try calling the edge function
            const { data, error } = await supabase.functions.invoke('review-store-application', {
                body: { requestId, status }
            });

            if (error) throw error;

            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (error: any) {
            console.error('Error reviewing application:', error);
            // Display the actual error message from the edge function or supabase
            alert(`Failed to process application: ${error.message || JSON.stringify(error)}`);
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return <div className="text-white">Loading applications...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Store Applications</h1>
                    <p className="text-slate-400">Review pending store owner requests</p>
                </div>
                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400">
                    {requests.length} Pending
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Store className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-white font-medium text-lg">No Pending Applications</h3>
                    <p className="text-slate-500 mt-1">All store requests have been reviewed.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {/* ... list content ... */}
                    {requests.map((request) => {
                        const store = request.profiles?.stores?.[0];
                        return (
                            <div key={request.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                                <div className="flex-1 space-y-1 text-center md:text-left">
                                    <h3 className="text-white font-bold text-lg">
                                        {store?.name || 'New Store'}
                                    </h3>
                                    <p className="text-slate-400 text-sm">Owner: {request.profiles.full_name || 'Unknown'}</p>

                                    {store?.registration_number && (
                                        <p className="text-slate-400 text-sm">Reg #: {store.registration_number}</p>
                                    )}

                                    {store?.document_url && (
                                        <a
                                            href={store.document_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-400 hover:text-green-300 text-sm underline block mt-1"
                                        >
                                            View Business License
                                        </a>
                                    )}

                                    <p className="text-slate-500 text-xs mt-1">
                                        Requested: {new Date(request.requested_at).toLocaleDateString()} at {new Date(request.requested_at).toLocaleTimeString()}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                                        <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-1 rounded border border-amber-500/20">
                                            Pending Review
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => handleReview(request.id, 'rejected')}
                                        disabled={processing === request.id}
                                        className="flex-1 md:flex-none h-10 px-4 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X size={16} />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleReview(request.id, 'approved')}
                                        disabled={processing === request.id}
                                        className="flex-1 md:flex-none h-10 px-6 rounded-lg bg-green-500 hover:bg-green-400 text-black font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        {processing === request.id ? (
                                            <Loader className="animate-spin" size={16} />
                                        ) : (
                                            <>
                                                <Check size={16} />
                                                Approve Access
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            )}

        </div>
    );
}
