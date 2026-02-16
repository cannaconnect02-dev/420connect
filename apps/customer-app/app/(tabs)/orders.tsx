import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { useCart } from '../../lib/CartContext';
import { Trash2, ShoppingBag, CheckCircle, Clock, Package, MapPin, Star, Plus, Minus, XCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import DriverRatingModal from '../components/DriverRatingModal';

// Distance calculation utility
import { getDistanceFromLatLonInKm } from '../../lib/utils';

// Constants
const MAX_DELIVERY_DISTANCE_KM = 35;

import { useRouter } from 'expo-router';

export default function OrdersScreen() {
    const router = useRouter();
    const { items, removeFromCart, incrementQuantity, decrementQuantity, total, clearCart, storeId } = useCart();
    const [placingOrder, setPlacingOrder] = useState(false);
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [selectedOrderForRating, setSelectedOrderForRating] = useState<any>(null);

    useEffect(() => {
        fetchActiveOrders();

        // Real-time subscription to order updates
        const channel = supabase.channel('customer-orders')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                console.log('Order update received!', payload);
                fetchActiveOrders(); // Refresh list to get new status
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchActiveOrders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            clearCart(); // Clear local cart if not authenticated
            return;
        }

        const { data } = await supabase
            .from('orders')
            .select('*, stores(name)')
            .eq('customer_id', session.user.id)
            .order('created_at', { ascending: false });

        if (data) setActiveOrders(data);
    };

    const handleCheckout = async () => {
        setPlacingOrder(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/auth');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('address_confirmed')
                .eq('id', user.id)
                .single();

            if (!profile?.address_confirmed) {
                throw new Error("Please confirm your delivery address before placing an order.");
            }

            // Fetch address from user_addresses
            const { data: addressData } = await supabase
                .from('user_addresses')
                .select('lat, lng, address_line1, city')
                .eq('user_id', user.id)
                .eq('is_default', true)
                .single();

            if (!addressData || !addressData.lat || !addressData.lng) {
                throw new Error("Delivery address not found. Please update your address in profile.");
            }

            const customerLat = addressData.lat;
            const customerLng = addressData.lng;
            const customerAddress = `${addressData.address_line1}, ${addressData.city}`;

            // 1. Fetch store location for geofencing check
            const { data: store, error: restError } = await supabase
                .from('stores')
                .select('latitude, longitude, name')
                .eq('id', storeId)
                .single();

            if (restError || !store) throw new Error("Could not find store details");

            // Check if store has location data
            if (!store.latitude || !store.longitude) {
                // Allow order if store has no location (fallback)
                console.log('Store has no location data, allowing order');
            } else {
                // 2. GEOFENCING CHECK - 35km limit
                const distance = getDistanceFromLatLonInKm(
                    customerLat, customerLng,
                    store.latitude, store.longitude
                );

                if (distance > MAX_DELIVERY_DISTANCE_KM) {
                    throw new Error(`Sorry, ${store.name} is ${distance.toFixed(1)}km away. Maximum delivery distance is ${MAX_DELIVERY_DISTANCE_KM}km.`);
                }
            }

            // 3. Create Order
            const { data: order, error } = await supabase
                .from('orders')
                .insert({
                    customer_id: user.id,
                    store_id: storeId, // Renamed column
                    total_amount: total,
                    status: 'pending',
                    delivery_address: customerAddress,
                    delivery_location: `POINT(${customerLng} ${customerLat})`,
                })
                .select()
                .single();

            if (error) throw error;

            // 4. Create Order Items
            const orderItems = items.map(item => ({
                order_id: order.id,
                menu_item_id: item.id,
                quantity: item.quantity,
                price_at_time: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // Success
            Alert.alert("Order Placed!", `${store.name} has received your order.\nDelivering to: ${customerAddress}`);
            clearCart();
            fetchActiveOrders();

        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setPlacingOrder(false);
        }
    };

    // Helper to get status color/icon
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { color: '#f59e0b', icon: Clock, label: 'Waiting for Confirm' }; // Amber
            case 'preparing': return { color: '#3b82f6', icon: Package, label: 'Packing Order' }; // Blue
            case 'ready_for_pickup': return { color: '#10b981', icon: CheckCircle, label: 'Ready for Driver' }; // Green
            case 'picked_up': return { color: '#8b5cf6', icon: MapPin, label: 'Driver on the way' }; // Purple
            case 'delivered': return { color: '#64748b', icon: CheckCircle, label: 'Delivered' }; // Slate
            case 'cancelled': return { color: '#ef4444', icon: XCircle, label: 'Cancelled' }; // Red
            case 'rejected': return { color: '#ef4444', icon: XCircle, label: 'Store Declined' }; // Red
            default: return { color: '#94a3b8', icon: Clock, label: status };
        }
    };

    if (items.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Your Cart</Text>
                </View>

                <View style={styles.emptyState}>
                    {/* @ts-ignore */}
                    <ShoppingBag size={64} color="#334155" />
                    <Text style={styles.emptyText}>Your cart is empty</Text>
                    <Text style={styles.emptySubtext}>Add items from a store to get started</Text>
                    <TouchableOpacity
                        style={styles.browseButton}
                        onPress={() => router.push('/(tabs)')}
                    >
                        <Text style={styles.browseButtonText}>Browse Stores</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Cart</Text>
                <TouchableOpacity onPress={clearCart}>
                    <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={items}
                keyExtractor={i => i.id}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                    <View style={styles.cartItem}>
                        {item.image_url && (
                            <Image
                                source={{ uri: item.image_url }}
                                style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
                            />
                        )}
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemPrice}>R{item.price}</Text>
                        </View>

                        <View style={styles.itemActions}>
                            <View style={styles.quantityControls}>
                                <TouchableOpacity
                                    onPress={() => decrementQuantity(item.id)}
                                    style={styles.qtyBtn}
                                >
                                    {/* @ts-ignore */}
                                    <Minus size={16} color="#94a3b8" />
                                </TouchableOpacity>

                                <Text style={styles.qtyText}>{item.quantity}</Text>

                                <TouchableOpacity
                                    onPress={() => incrementQuantity(item.id)}
                                    style={styles.qtyBtn}
                                >
                                    {/* @ts-ignore */}
                                    <Plus size={16} color="white" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.itemTotal}>R{(item.price * item.quantity).toFixed(2)}</Text>

                            <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeBtn}>
                                {/* @ts-ignore */}
                                <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>R{total.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                    style={styles.checkoutBtn}
                    onPress={() => router.push('/checkout')}
                    disabled={placingOrder}
                >
                    <Text style={styles.checkoutText}>Checkout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617', // Darker background
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    clearText: {
        color: '#ef4444',
        fontSize: 16,
    },
    cartItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    itemPrice: {
        color: '#94a3b8',
    },
    itemActions: {
        alignItems: 'flex-end',
        gap: 8,
    },
    itemTotal: {
        color: '#10b981',
        fontWeight: 'bold',
        fontSize: 16,
    },
    removeBtn: {
        padding: 4,
    },
    footer: {
        padding: 24,
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    totalLabel: {
        color: '#94a3b8',
        fontSize: 18,
    },
    totalValue: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    checkoutBtn: {
        backgroundColor: '#10b981',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    checkoutText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptySubtext: {
        color: '#64748b',
        marginTop: 8,
    },
    orderCard: {
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderRest: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontWeight: 'bold',
        fontSize: 10,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#334155',
        borderRadius: 3,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    orderMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderDate: {
        color: '#94a3b8',
        fontSize: 12,
    },
    orderTotal: {
        color: '#10b981',
        fontWeight: 'bold',
        fontSize: 16,
    },
    rateDriverBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 12,
        backgroundColor: '#fbbf2420',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fbbf24',
    },
    rateDriverText: {
        color: '#fbbf24',
        fontWeight: 'bold',
        fontSize: 14,
    },
    ratedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        paddingVertical: 8,
        backgroundColor: '#10b98120',
        borderRadius: 8,
    },
    ratedText: {
        color: '#10b981',
        fontWeight: '600',
        fontSize: 12,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginRight: 16,
        backgroundColor: '#0f172a',
        padding: 4,
        borderRadius: 8,
    },
    qtyBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        minWidth: 20,
        textAlign: 'center',
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
});
