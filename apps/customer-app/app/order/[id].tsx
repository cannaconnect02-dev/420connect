import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
    ArrowLeft, Clock, CheckCircle, ChefHat, Package, Truck, Navigation,
    XCircle, MapPin, Phone, MessageCircle, Store, User
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface OrderItem {
    id: string;
    quantity: number;
    price_at_time: number;
    menu_items: {
        name: string;
    };
}

interface Order {
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    delivery_address: string;
    paystack_reference: string;
    paystack_payment_status: string;
    store_id: string;
    driver_id?: string;
    stores: {
        name: string;
        phone?: string;
        address?: string;
    };
    order_items: OrderItem[];
}

const STATUS_STAGES = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'accepted', label: 'Accepted', icon: CheckCircle },
    { key: 'preparing', label: 'Preparing', icon: ChefHat },
    { key: 'ready_for_pickup', label: 'Ready', icon: Package },
    { key: 'picked_up', label: 'Picked Up', icon: Truck },
    { key: 'out_for_delivery', label: 'On the Way', icon: Navigation },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const getStatusIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    return STATUS_STAGES.findIndex(s => s.key === status);
};

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrder();
    }, [id]);

    async function fetchOrder() {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    status,
                    total_amount,
                    created_at,
                    delivery_address,
                    paystack_reference,
                    paystack_payment_status,
                    store_id,
                    driver_id,
                    stores:store_id (name, phone, address),
                    order_items (
                        id,
                        quantity,
                        price_at_time,
                        menu_items:menu_item_id (name)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setOrder(data as any);
        } catch (error) {
            console.error('Error fetching order:', error);
            Alert.alert('Error', 'Could not load order details');
        } finally {
            setLoading(false);
        }
    }

    const formatOrderNumber = (orderId: string) => {
        return `#ORD-${orderId.slice(0, 8).toUpperCase()}`;
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const callPhone = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const currentStatusIndex = order ? getStatusIndex(order.status) : -1;
    const isCancelled = order?.status === 'cancelled';

    if (loading || !order) {
        return (
            <View style={styles.loading}>
                <Text style={styles.loadingText}>Loading order...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f172a', '#1e1b4b', '#0f172a']}
                style={styles.background}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>{formatOrderNumber(order.id)}</Text>
                    <Text style={styles.headerSubtitle}>{formatDateTime(order.created_at)}</Text>
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Store Info */}
                <View style={styles.section}>
                    <View style={styles.storeCard}>
                        <View style={styles.storeIcon}>
                            <Store size={24} color="#10b981" />
                        </View>
                        <View style={styles.storeInfo}>
                            <Text style={styles.storeName}>{order.stores?.name || 'Store'}</Text>
                            <Text style={styles.storeAddress}>{order.stores?.address || 'No address'}</Text>
                        </View>
                        {order.stores?.phone && (
                            <TouchableOpacity
                                style={styles.callButton}
                                onPress={() => callPhone(order.stores.phone!)}
                            >
                                <Phone size={20} color="#10b981" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Status Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Status</Text>

                    {isCancelled ? (
                        <View style={styles.cancelledBanner}>
                            <XCircle size={24} color="#ef4444" />
                            <Text style={styles.cancelledText}>Order Cancelled</Text>
                        </View>
                    ) : (
                        <View style={styles.timeline}>
                            {STATUS_STAGES.map((stage, index) => {
                                const isCompleted = index <= currentStatusIndex;
                                const isCurrent = index === currentStatusIndex;
                                const StageIcon = stage.icon;

                                return (
                                    <View key={stage.key} style={styles.timelineItem}>
                                        <View style={styles.timelineLeft}>
                                            <View style={[
                                                styles.timelineIcon,
                                                isCompleted && styles.timelineIconCompleted,
                                                isCurrent && styles.timelineIconCurrent,
                                            ]}>
                                                <StageIcon
                                                    size={18}
                                                    color={isCompleted ? 'white' : '#64748b'}
                                                />
                                            </View>
                                            {index < STATUS_STAGES.length - 1 && (
                                                <View style={[
                                                    styles.timelineLine,
                                                    isCompleted && index < currentStatusIndex && styles.timelineLineCompleted,
                                                ]} />
                                            )}
                                        </View>
                                        <View style={styles.timelineContent}>
                                            <Text style={[
                                                styles.timelineLabel,
                                                isCompleted && styles.timelineLabelCompleted,
                                                isCurrent && styles.timelineLabelCurrent,
                                            ]}>
                                                {stage.label}
                                            </Text>
                                            {isCurrent && (
                                                <Text style={styles.currentStatus}>Current</Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Delivery Address */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Delivery Address</Text>
                    <View style={styles.addressCard}>
                        <MapPin size={20} color="#10b981" />
                        <Text style={styles.addressText}>{order.delivery_address}</Text>
                    </View>
                </View>

                {/* Order Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Items</Text>
                    <View style={styles.itemsCard}>
                        {order.order_items?.map((item) => (
                            <View key={item.id} style={styles.orderItem}>
                                <View style={styles.itemQuantity}>
                                    <Text style={styles.quantityText}>{item.quantity}x</Text>
                                </View>
                                <Text style={styles.itemName}>{item.menu_items?.name}</Text>
                                <Text style={styles.itemPrice}>R{(item.price_at_time * item.quantity).toFixed(2)}</Text>
                            </View>
                        ))}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalAmount}>R{order.total_amount.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Payment Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment</Text>
                    <View style={styles.paymentCard}>
                        <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Status</Text>
                            <View style={[
                                styles.paymentBadge,
                                order.paystack_payment_status === 'charged' && styles.paymentBadgePaid
                            ]}>
                                <Text style={styles.paymentBadgeText}>
                                    {order.paystack_payment_status?.toUpperCase() || 'PENDING'}
                                </Text>
                            </View>
                        </View>
                        {order.paystack_reference && (
                            <View style={styles.paymentRow}>
                                <Text style={styles.paymentLabel}>Reference</Text>
                                <Text style={styles.paymentValue}>{order.paystack_reference}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Contact Options */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Need Help?</Text>
                    <View style={styles.contactButtons}>
                        {order.stores?.phone && (
                            <TouchableOpacity
                                style={styles.contactButton}
                                onPress={() => callPhone(order.stores.phone!)}
                            >
                                <Phone size={20} color="white" />
                                <Text style={styles.contactButtonText}>Call Store</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.contactButton, styles.contactButtonSecondary]}
                            onPress={() => Alert.alert('Support', 'Contact support@420connect.com for help')}
                        >
                            <MessageCircle size={20} color="#10b981" />
                            <Text style={[styles.contactButtonText, styles.contactButtonTextSecondary]}>Support</Text>
                        </TouchableOpacity>
                    </View>
                </View>

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
    loading: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#94a3b8',
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    headerSubtitle: {
        color: '#94a3b8',
        fontSize: 14,
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    storeCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    storeInfo: {
        flex: 1,
        marginLeft: 12,
    },
    storeName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    storeAddress: {
        color: '#94a3b8',
        fontSize: 14,
        marginTop: 2,
    },
    callButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelledBanner: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cancelledText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: 'bold',
    },
    timeline: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        minHeight: 50,
    },
    timelineLeft: {
        alignItems: 'center',
        width: 40,
    },
    timelineIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timelineIconCompleted: {
        backgroundColor: '#10b981',
    },
    timelineIconCurrent: {
        backgroundColor: '#10b981',
        borderWidth: 3,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#334155',
        marginVertical: 4,
    },
    timelineLineCompleted: {
        backgroundColor: '#10b981',
    },
    timelineContent: {
        flex: 1,
        paddingLeft: 12,
        paddingTop: 8,
    },
    timelineLabel: {
        color: '#64748b',
        fontSize: 15,
    },
    timelineLabelCompleted: {
        color: 'white',
    },
    timelineLabelCurrent: {
        color: '#10b981',
        fontWeight: 'bold',
    },
    currentStatus: {
        color: '#10b981',
        fontSize: 12,
        marginTop: 2,
    },
    addressCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    addressText: {
        color: 'white',
        fontSize: 15,
        flex: 1,
    },
    itemsCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
    },
    orderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    itemQuantity: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    quantityText: {
        color: '#10b981',
        fontWeight: 'bold',
        fontSize: 13,
    },
    itemName: {
        color: 'white',
        fontSize: 15,
        flex: 1,
    },
    itemPrice: {
        color: '#94a3b8',
        fontSize: 15,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 16,
        marginTop: 8,
    },
    totalLabel: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    totalAmount: {
        color: '#10b981',
        fontSize: 20,
        fontWeight: 'bold',
    },
    paymentCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    paymentLabel: {
        color: '#94a3b8',
        fontSize: 14,
    },
    paymentValue: {
        color: 'white',
        fontSize: 14,
    },
    paymentBadge: {
        backgroundColor: '#334155',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    paymentBadgePaid: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    paymentBadgeText: {
        color: '#10b981',
        fontSize: 12,
        fontWeight: 'bold',
    },
    contactButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    contactButton: {
        flex: 1,
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    contactButtonSecondary: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    contactButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    contactButtonTextSecondary: {
        color: '#10b981',
    },
});
