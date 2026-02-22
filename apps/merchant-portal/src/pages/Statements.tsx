import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Printer, Loader2, Calendar as CalendarIcon, Banknote, TrendingDown, Percent, FileCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

type ItemBreakdown = {
    name: string;
    qty: number;
    revenue: number;
};

type ReportData = {
    storeName: string;
    storeAddress: string;
    grossRevenue: number;
    totalVAT: number;
    totalPlatformMarkup: number;
    totalPaystackFee: number;
    totalDebt: number;
    netPayout: number;
    vatRate: number;
    paystackRate: number;
    platformMarkupRate: number;
    itemBreakdown: ItemBreakdown[];
};

export default function Statements() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [storeId, setStoreId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }));
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState<ReportData | null>(null);

    useEffect(() => {
        if (user) {
            fetchStore();
        }
    }, [user]);

    const fetchStore = async () => {
        try {
            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('id')
                .eq('owner_id', user?.id)
                .maybeSingle();

            if (storeError) throw storeError;
            if (store) {
                setStoreId(store.id);
            }
        } catch (error: any) {
            console.error('Error fetching store:', error);
            toast({ title: 'Error', description: 'Failed to load store profile.', variant: 'destructive' });
        }
    };

    const handleGenerate = async () => {
        if (!storeId) return;
        setIsGenerating(true);
        setReportData(null);

        const startStr = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const endStr = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

        try {
            const { data: result, error } = await supabase.functions.invoke('generate-statement', {
                body: { store_id: storeId, week_start_date: startStr, week_end_date: endStr }
            });

            if (error) {
                console.error("Supabase Invoke Error:", error);

                if (error.name === 'FunctionsHttpError') {
                    throw new Error("Session expired. Please Sign Out and Sign In again.");
                }

                throw new Error(error.message || 'Failed to generate statement network error');
            }

            if (!result || !result.success) {
                throw new Error(result?.error || 'Failed to generate statement on server');
            }

            setReportData({
                storeName: result.storeName || 'Unknown Store',
                storeAddress: result.storeAddress || '',
                grossRevenue: result.grossRevenue || 0,
                totalVAT: result.totalVAT || 0,
                totalPlatformMarkup: result.totalPlatformMarkup || 0,
                totalPaystackFee: result.totalPaystackFee || 0,
                totalDebt: result.totalDebt || 0,
                netPayout: result.netPayout || 0,
                vatRate: result.vatRate || 0.15,
                paystackRate: result.paystackRate || 0.029,
                platformMarkupRate: result.platformMarkupRate || 0.20,
                itemBreakdown: result.itemBreakdown || []
            });

            toast({
                title: 'Statement Ready',
                description: 'Your weekly financial report has been compiled.'
            });

        } catch (error: any) {
            console.error('Generation Error Full Object:', { error, message: error.message, stack: error.stack });
            toast({
                title: 'Generation Failed',
                description: error.message || 'An unknown error occurred during generation.',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const weekOptions = Array.from({ length: 12 }).map((_, i) => {
        const date = subWeeks(new Date(), i);
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
        return {
            value: start.toISOString(),
            label: `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`,
            date: start
        };
    });

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex justify-between items-end">
                <div className="print:hidden">
                    <h1 className="text-3xl font-bold text-foreground">Weekly Financial Reports</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">Review revenue and automated deductions for any given week.</p>
                </div>
                {reportData && (
                    <Button variant="outline" onClick={handlePrint} className="hidden md:flex">
                        <Printer className="w-4 h-4 mr-2" /> Print Statement
                    </Button>
                )}
            </div>

            {/* Controls */}
            <Card className="bg-card border-border print:hidden">
                <CardContent className="flex flex-col md:flex-row items-end gap-4 pt-6">
                    <div className="w-full md:w-72 space-y-2">
                        <label className="text-sm font-medium">Select Billing Week</label>
                        <Select
                            value={selectedDate.toISOString()}
                            onValueChange={(val) => setSelectedDate(new Date(val))}
                        >
                            <SelectTrigger>
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Select week..." />
                            </SelectTrigger>
                            <SelectContent>
                                {weekOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        className="w-full md:w-auto min-w-[140px]"
                        onClick={handleGenerate}
                        disabled={isGenerating || !storeId}
                    >
                        {isGenerating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compiling...</>
                        ) : (
                            <><FileText className="w-4 h-4 mr-2" /> Generate</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Report View */}
            {reportData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Header Details */}
                    <div className="bg-white dark:bg-card p-6 rounded-lg border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">{reportData.storeName}</h2>
                            <p className="text-muted-foreground text-sm">{reportData.storeAddress}</p>
                        </div>
                        <div className="mt-4 md:mt-0 text-left md:text-right">
                            <p className="text-sm font-medium text-foreground">Statement Period</p>
                            <p className="text-sm text-muted-foreground">
                                {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                            </p>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-6 print:gap-4">
                        <Card className="bg-slate-900 border-slate-800 print:border-slate-300 print:bg-white">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-400 print:text-slate-600">Gross Revenue</p>
                                        <p className="text-xl font-bold text-white print:text-black">R {reportData.grossRevenue.toFixed(2)}</p>
                                    </div>
                                    <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center print:hidden">
                                        <Banknote className="w-6 h-6 text-blue-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-slate-800 print:border-slate-300 print:bg-white">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-400 print:text-slate-600">Total Deductions</p>
                                        <p className="text-xl font-bold text-red-400 print:text-red-600">
                                            R {(reportData.totalPlatformMarkup + reportData.totalPaystackFee + reportData.totalDebt).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="h-12 w-12 bg-red-500/10 rounded-full flex items-center justify-center print:hidden">
                                        <TrendingDown className="w-6 h-6 text-red-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-green-600 border-green-500 text-white print:border-green-600 print:bg-white print:text-black">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-green-100 print:text-green-800">Net Payout</p>
                                        <p className="text-2xl font-bold print:text-green-700">R {reportData.netPayout.toFixed(2)}</p>
                                    </div>
                                    <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center print:hidden">
                                        <FileCheck className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-1 gap-6 print:gap-4 print:break-inside-avoid">
                        {/* Deductions Breakdown */}
                        <Card className="bg-card border-border print:shadow-none">
                            <CardHeader>
                                <CardTitle className="text-lg">Deduction Breakdown</CardTitle>
                                <CardDescription>Itemized fees and debt automatically subtracted.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start py-2 border-b border-border">
                                        <div>
                                            <span className="text-foreground flex items-center font-medium"><Percent className="w-4 h-4 mr-2 text-muted-foreground" /> Platform Markup</span>
                                            <span className="text-xs text-muted-foreground ml-6 block mt-1">
                                                Gross (R{reportData.grossRevenue.toFixed(2)}) × {(reportData.platformMarkupRate * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <span className="font-semibold text-foreground mt-1">R {reportData.totalPlatformMarkup.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-start py-2 border-b border-border">
                                        <div>
                                            <span className="text-foreground flex items-center font-medium"><Banknote className="w-4 h-4 mr-2 text-muted-foreground" /> Paystack Processing</span>
                                            <span className="text-xs text-muted-foreground ml-6 block mt-1">
                                                (Gross × {(reportData.paystackRate * 100).toFixed(1)}% + R1 Base) × (1 + {(reportData.vatRate * 100).toFixed(1)}% VAT)
                                            </span>
                                        </div>
                                        <span className="font-semibold text-foreground mt-1">R {reportData.totalPaystackFee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-start py-2 border-b border-border">
                                        <div>
                                            <span className="text-foreground flex items-center font-medium"><TrendingDown className="w-4 h-4 mr-2 text-muted-foreground" /> Unpaid Ledger Debt</span>
                                            <span className="text-xs text-muted-foreground ml-6 block mt-1">Outstanding store fees or hardware debt</span>
                                        </div>
                                        <span className="font-semibold text-red-500 mt-1">R {reportData.totalDebt.toFixed(2)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Product Sales Breakdown */}
                        <Card className="bg-card border-border print:shadow-none print:break-inside-avoid print:mt-4">
                            <CardHeader>
                                <CardTitle className="text-lg">Product Sales</CardTitle>
                                <CardDescription>Aggregated performance by menu item.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {reportData.itemBreakdown.length === 0 ? (
                                    <div className="py-6 text-center text-muted-foreground bg-accent/20 rounded-lg border border-border">
                                        No item sales recorded for this week.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-muted-foreground uppercase bg-accent/50">
                                                <tr>
                                                    <th className="px-4 py-3 rounded-l-lg">Item</th>
                                                    <th className="px-4 py-3 text-right">Qty</th>
                                                    <th className="px-4 py-3 text-right rounded-r-lg">Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.itemBreakdown.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-border last:border-0 hover:bg-accent/20">
                                                        <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                                                        <td className="px-4 py-3 text-right">{item.qty}</td>
                                                        <td className="px-4 py-3 text-right">R {item.revenue.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Print specific styles */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            body { background: white; color: black; }
                            .bg-slate-900 { background: white !important; border-color: #e2e8f0 !important; }
                            .bg-green-600 { background: white !important; color: black !important; border-color: #22c55e !important; }
                            .text-slate-400, .text-muted-foreground { color: #64748b !important; }
                            .text-white { color: black !important; }
                            .text-green-100 { color: #64748b !important; }
                            .text-blue-500 { color: #3b82f6 !important; }
                            .text-blue-400 { color: #3b82f6 !important; }
                            .text-red-400, .text-red-500 { color: #ef4444 !important; }
                            .border-slate-800, .border-border { border-color: #e2e8f0 !important; }
                            main { padding: 0 !important; margin: 0 !important; }
                            aside { display: none !important; }
                        }
                    `}} />

                </div>
            )}
        </div>
    );
}
