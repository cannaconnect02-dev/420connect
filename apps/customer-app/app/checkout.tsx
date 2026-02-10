import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useCart } from '../lib/CartContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { MapPin, CreditCard, ShieldCheck, ChevronRight, Lock, ArrowLeft } from 'lucide-react-native';
import { usePaystack, PaystackProvider } from 'react-native-paystack-webview';
import { getDistanceFromLatLonInKm } from '../lib/utils';

// Constants
const MAX_DELIVERY_DISTANCE_KM = 35;

function CheckoutContent() {
    const router = useRouter();
    const { items, total, clearCart, storeId } = useCart();
    const [loading, setLoading] = useState(true);
    const [address, setAddress] = useState<any>(null);
    const [userEmail, setUserEmail] = useState('');
    const [processing, setProcessing] = useState(false);

    // Paystack hook - must be inside PaystackProvider
    const { popup } = usePaystack();

    useFocusEffect(
        useCallback(() => {
            fetchCheckoutData();
        }, [])
    );

    async function fetchCheckoutData() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/auth');
                return;
            }
            setUserEmail(user.email || '');

            const { data: addressData } = await supabase
                .from('user_addresses')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_default', true)
                .single();

            if (addressData) {
                setAddress(addressData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handlePaymentSuccess(reference: string) {
        // Payment successful, now create order
        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !address) return;

            // 1. Validate Store Location again (Safety check)
            const { data: store } = await supabase
                .from('stores')
                .select('latitude, longitude, name')
                .eq('id', storeId)
                .single();

            if (store && store.latitude && store.longitude && address.lat && address.lng) {
                const distance = getDistanceFromLatLonInKm(
                    address.lat, address.lng,
                    store.latitude, store.longitude
                );

                if (distance && distance > MAX_DELIVERY_DISTANCE_KM) {
                    throw new Error(`Store is too far away (${distance.toFixed(1)}km).`);
                }
            }

            const customerAddress = `${address.address_line1}, ${address.city}`;

            // 2. Create Order
            const { data: order, error } = await supabase
                .from('orders')
                .insert({
                    customer_id: user.id,
                    store_id: storeId,
                    total_amount: total,
                    status: 'pending',
                    delivery_address: customerAddress,
                    delivery_location: address.lat && address.lng ? `POINT(${address.lng} ${address.lat})` : null,
                    payment_ref: reference, // Save Paystack reference
                    payment_status: 'paid'
                })
                .select()
                .single();

            if (error) throw error;

            // 3. Create Order Items
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

            // Success Flow
            clearCart();
            Alert.alert(
                "Order Confirmed!",
                "Your order has been placed successfully.",
                [{ text: "OK", onPress: () => router.replace('/(tabs)/orders') }]
            );

        } catch (error: any) {
            Alert.alert("Order Error", error.message || "Failed to create order");
        } finally {
            setProcessing(false);
        }
    }

    function initiatePayment() {
        if (!address) {
            Alert.alert('Address Required', 'Please set a delivery address first.');
            return;
        }

        if (total <= 0) {
            Alert.alert('Invalid Amount', 'Cart total cannot be zero.');
            return;
        }

        if (processing) return;
        setProcessing(true);

        try {
            const amountInKobo = Math.round(total * 100);

            popup.checkout({
                email: userEmail,
                amount: amountInKobo,
                onSuccess: (response: { reference: string }) => {
                    handlePaymentSuccess(response.reference);
                },
                onCancel: () => {
                    setProcessing(false);
                    Alert.alert("Payment Cancelled", "You cancelled the payment process.");
                },
                onError: (e: any) => {
                    console.error("Paystack Error:", e);
                    Alert.alert("Payment Failed", "An error occurred with the payment processor.");
                    setProcessing(false);
                }
            });
        } catch (e) {
            console.error("Initiate Payment Error:", e);
            Alert.alert("Error", "Could not start payment.");
            setProcessing(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* 1. Delivery Address */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Delivery Address</Text>
                    <View style={styles.card}>
                        <View style={styles.addressRow}>
                            <View style={styles.iconBox}>
                                <MapPin size={20} color="#10b981" />
                            </View>
                            <View style={styles.addressInfo}>
                                {address ? (
                                    <>
                                        <Text style={styles.addressLabel}>Home</Text>
                                        <Text style={styles.addressText}>{address.address_line1}</Text>
                                        <Text style={styles.addressSubText}>{address.city}, {address.postal_code}</Text>
                                    </>
                                ) : (
                                    <Text style={styles.addressText}>No address set</Text>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => router.push('/delivery-address-edit')}
                        >
                            <Text style={styles.editText}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2. Order Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>
                    <View style={styles.card}>
                        {items.map((item) => (
                            <View key={item.id} style={styles.summaryRow}>
                                <Text style={styles.summaryItemText}>
                                    <Text style={styles.qty}>{item.quantity}x</Text> {item.name}
                                </Text>
                                <Text style={styles.summaryPrice}>R{(item.price * item.quantity).toFixed(2)}</Text>
                            </View>
                        ))}
                        <View style={styles.divider} />
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>R{total.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* 3. Payment Method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    <View style={styles.card}>
                        <View style={styles.paymentRow}>
                            <CreditCard size={24} color="#94a3b8" />
                            <Text style={styles.paymentText}>Paystack Secure Payment</Text>
                            <ShieldCheck size={16} color="#10b981" />
                        </View>
                    </View>
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.secureBadge}>
                    <Lock size={12} color="#94a3b8" />
                    <Text style={styles.secureText}>Payments are secure and encrypted</Text>
                </View>

                <TouchableOpacity
                    style={[styles.payButton, (!address || processing) && styles.payButtonDisabled]}
                    onPress={initiatePayment}
                    disabled={!address || processing}
                >
                    {processing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <View style={styles.payButtonContent}>
                            <Text style={styles.payButtonText}>Pay R{total.toFixed(2)}</Text>
                            <ChevronRight size={20} color="white" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function CheckoutScreen() {
    return (
        <PaystackProvider
            publicKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_43aaa69c571b230508c9865a289e545c2d6c545b'}
        >
            <CheckoutContent />
        </PaystackProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        paddingTop: 50,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
    },
    // Address Styles
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addressInfo: {
        flex: 1,
    },
    addressLabel: {
        color: '#10b981',
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 2,
    },
    addressText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    addressSubText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    editButton: {
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 12,
        alignItems: 'center',
    },
    editText: {
        color: '#10b981',
        fontWeight: '600',
    },
    // Summary Styles
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryItemText: {
        color: '#cbd5e1',
        fontSize: 15,
        flex: 1,
    },
    qty: {
        color: '#10b981',
        fontWeight: 'bold',
    },
    summaryPrice: {
        color: 'white',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#334155',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValue: {
        color: '#10b981',
        fontSize: 24,
        fontWeight: 'bold',
    },
    // Payment Styles
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    paymentText: {
        color: 'white',
        fontSize: 16,
        flex: 1,
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 36,
    },
    secureBadge: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    secureText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    payButton: {
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    payButtonDisabled: {
        backgroundColor: '#334155',
        opacity: 0.7,
    },
    payButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    payButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
