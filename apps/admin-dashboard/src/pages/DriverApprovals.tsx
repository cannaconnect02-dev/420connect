import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Check, X, ShieldAlert, CheckCircle, Clock, History } from 'lucide-react';

interface Profile {
    id: string;
    full_name: string;
    role: string;
    status: string;
    created_at: string;
    rejection_reason?: string;
}

interface Toast {
    message: string;
    type: 'success' | 'error';
}

export default function DriverApprovals() {
    console.log('DriverApprovals: Rendering...');
    const [drivers, setDrivers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectingName, setRejectingName] = useState('');
    const [reason, setReason] = useState('');
    const [toast, setToast] = useState<Toast | null>(null);
    const [recentLogs, setRecentLogs] = useState<Profile[]>([]);

    useEffect(() => {
        fetchPendingDrivers();
        fetchRecentLogs();
    }, []);

    // Auto-hide toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    async function fetchPendingDrivers() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'driver')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('DriverApprovals: API Error', error);
                throw error;
            }
            console.log('DriverApprovals: Fetched drivers', data);
            setDrivers(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchRecentLogs() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'driver')
                .in('status', ['approved', 'rejected'])
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;
            setRecentLogs(data || []);
        } catch (err: any) {
            console.error('Error fetching logs:', err);
        }
    }

    async function handleApprove(id: string, name: string) {
        await updateStatus(id, 'approved');
        setToast({ message: `${name || 'Driver'} has been approved!`, type: 'success' });
    }

    function openRejectModal(id: string, name: string) {
        setRejectingId(id);
        setRejectingName(name || 'this driver');
    }

    async function handleReject() {
        if (!rejectingId || !reason.trim()) return;
        await updateStatus(rejectingId, 'rejected', reason);
        setToast({ message: `${rejectingName} has been rejected.`, type: 'error' });
        setRejectingId(null);
        setRejectingName('');
        setReason('');
    }

    async function updateStatus(id: string, status: string, rejectionReason: string | null = null) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    status: status,
                    rejection_reason: rejectionReason
                })
                .eq('id', id);

            if (error) throw error;

            // Remove from list and refresh logs
            setDrivers(drivers.filter(d => d.id !== id));
            fetchRecentLogs();
        } catch (err: any) {
            setToast({ message: 'Error: ' + err.message, type: 'error' });
        }
    }

    if (loading) return <div>Loading applicants...</div>;

    return (
        <div className="max-w-4xl relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg animate-slide-in ${toast.type === 'success'
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : 'bg-red-500/20 border border-red-500/50 text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Driver Approvals</h1>
                    <p className="text-slate-400">Review pending driver applications.</p>
                </div>
                <div className="bg-blue-600/10 text-blue-400 px-4 py-2 rounded-full font-medium border border-blue-600/20">
                    {drivers.length} Pending
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <ShieldAlert size={20} />
                    {error}
                </div>
            )}

            {drivers.length === 0 ? (
                <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                        <Check size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
                    <p className="text-slate-400">There are no pending driver applications to review.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {drivers.map((driver) => (
                        <div key={driver.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white">{driver.full_name || 'Unnamed User'}</h3>
                                    <p className="text-slate-400 text-sm">Applied: {new Date(driver.created_at).toLocaleDateString()}</p>
                                    <code className="text-xs text-slate-600 mt-1 block">{driver.id}</code>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => openRejectModal(driver.id, driver.full_name)}
                                    className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                                    title="Reject"
                                >
                                    <X size={20} />
                                </button>
                                <button
                                    onClick={() => handleApprove(driver.id, driver.full_name)}
                                    className="flex items-center gap-2 px-5 py-3 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl transition-colors"
                                >
                                    <Check size={20} /> Approve
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Rejection Modal */}
            {rejectingId && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-2">Reject Application</h3>
                        <p className="text-slate-400 mb-4">
                            Please provide a reason for rejecting <span className="text-white font-medium">{rejectingName}</span>.
                            This feedback will be shared with the applicant.
                        </p>

                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white mb-6 focus:border-red-500 focus:outline-none"
                            placeholder="e.g., Missing valid driver's license, vehicle registration incomplete..."
                            rows={3}
                            autoFocus
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setRejectingId(null); setRejectingName(''); setReason(''); }}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!reason.trim()}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity Log */}
            {recentLogs.length > 0 && (
                <div className="mt-12">
                    <div className="flex items-center gap-3 mb-4">
                        <History size={20} className="text-slate-400" />
                        <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        {recentLogs.map((log, index) => (
                            <div
                                key={log.id}
                                className={`flex items-center justify-between p-4 ${index < recentLogs.length - 1 ? 'border-b border-slate-800' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.status === 'approved'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {log.status === 'approved' ? <Check size={16} /> : <X size={16} />}
                                    </div>
                                    <div>
                                        <span className="text-white font-medium">{log.full_name || 'Unknown Driver'}</span>
                                        {log.rejection_reason && (
                                            <p className="text-slate-500 text-sm mt-0.5">Reason: {log.rejection_reason}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${log.status === 'approved'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {log.status === 'approved' ? 'Approved' : 'Rejected'}
                                    </span>
                                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                                        <Clock size={14} />
                                        {new Date(log.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

