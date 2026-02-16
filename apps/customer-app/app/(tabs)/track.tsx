import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Package, Clock, CheckCircle, ChefHat, Truck, Navigation, XCircle, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Order {
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    delivery_address: string;
    store_id: string;
    store?: {
        name: string;
        image_url?: string;
    };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'Order Placed', color: '#f59e0b', icon: Clock },
    accepted: { label: 'Accepted', color: '#10b981', icon: CheckCircle },
    preparing: { label: 'Preparing', color: '#8b5cf6', icon: ChefHat },
    ready_for_pickup: { label: 'Ready', color: '#06b6d4', icon: Package },
    picked_up: { label: 'Picked Up', color: '#3b82f6', icon: Truck },
    out_for_delivery: { label: 'On the Way', color: '#10b981', icon: Navigation },
    delivered: { label: 'Delivered', color: '#22c55e', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: '#ef4444', icon: XCircle },
};

export default function TrackScreen() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
            // Optional cleanup if needed (e.g. canceling fetch)
            return () => { };
        }, [])
    );

    async function fetchOrders() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch active orders (not delivered or cancelled)
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    status,
                    total_amount,
                    created_at,
                    delivery_address,
                    store_id,
                    stores:store_id (name, image_url)
                `)
                .eq('customer_id', user.id)
                .not('status', 'in', '(delivered)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform data to match our interface
            const transformedOrders = (data || []).map(order => ({
                ...order,
                store: order.stores as any
            }));

            setOrders(transformedOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    }

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOrders();
        setRefreshing(false);
    }, []);

    const formatOrderNumber = (id: string) => {
        return `#ORD-${id.slice(0, 8).toUpperCase()}`;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f172a', '#1e1b4b', '#0f172a']}
                style={styles.background}
            />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Order Tracking</Text>
                <Text style={styles.headerSubtitle}>Track your active orders</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#10b981"
                        colors={['#10b981']}
                    />
                }
            >
                {loading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Loading orders...</Text>
                    </View>
                ) : orders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Package size={64} color="#334155" />
                        <Text style={styles.emptyTitle}>No Active Orders</Text>
                        <Text style={styles.emptyText}>Your order tracking will appear here once you place an order.</Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.push('/(tabs)')}
                        >
                            <Text style={styles.browseButtonText}>Browse Stores</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    orders.map((order) => {
                        const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                        const StatusIcon = statusConfig.icon;

                        return (
                            <TouchableOpacity
                                key={order.id}
                                style={styles.orderCard}
                                onPress={() => router.push(`/order/${order.id}`)}
                            >
                                <View style={styles.orderHeader}>
                                    <View style={styles.storeInfo}>
                                        <View style={styles.storeIcon}>
                                            <Package size={20} color="#10b981" />
                                        </View>
                                        <View>
                                            <Text style={styles.storeName}>{order.store?.name || 'Store'}</Text>
                                            <Text style={styles.orderNumber}>{formatOrderNumber(order.id)}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.orderMeta}>
                                        <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                                        <Text style={styles.orderTime}>{formatTime(order.created_at)}</Text>
                                    </View>
                                </View>

                                <View style={styles.statusRow}>
                                    <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
                                        <StatusIcon size={16} color={statusConfig.color} />
                                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                            {statusConfig.label}
                                        </Text>
                                    </View>
                                    <Text style={styles.orderTotal}>R{order.total_amount.toFixed(2)}</Text>
                                </View>

                                <View style={styles.addressRow}>
                                    <MapPin size={14} color="#94a3b8" />
                                    <Text style={styles.addressText} numberOfLines={1}>
                                        {order.delivery_address}
                                    </Text>
                                </View>

                                <View style={styles.trackButton}>
                                    <Text style={styles.trackButtonText}>View Details →</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: '100%',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 20,
    },
    emptyText: {
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
    browseButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 20,
    },
    browseButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    orderCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    storeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    storeIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    storeName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    orderNumber: {
        color: '#94a3b8',
        fontSize: 13,
        marginTop: 2,
    },
    orderMeta: {
        alignItems: 'flex-end',
    },
    orderDate: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    orderTime: {
        color: '#94a3b8',
        fontSize: 13,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    orderTotal: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    addressText: {
        color: '#94a3b8',
        fontSize: 14,
        flex: 1,
    },
    trackButton: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155',
        alignItems: 'center',
    },
    trackButtonText: {
        color: '#10b981',
        fontSize: 15,
        fontWeight: '600',
    },
});
