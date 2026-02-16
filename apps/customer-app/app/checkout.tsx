import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useCart } from '../lib/CartContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { MapPin, CreditCard, ShieldCheck, ChevronRight, Lock, ArrowLeft, X, Users } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { getDistanceFromLatLonInKm } from '../lib/utils';

// Constants
// Constants
// Default fallback if settings fail
const DEFAULT_MAX_DELIVERY_DISTANCE = 35;

function CheckoutContent() {
    const router = useRouter();
    const { items, total: cartTotal, clearCart, storeId } = useCart();
    const [loading, setLoading] = useState(true);
    const [address, setAddress] = useState<any>(null);
    const [userEmail, setUserEmail] = useState('');
    const [processing, setProcessing] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [calculatingFee, setCalculatingFee] = useState(false);
    const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [maxDeliveryDistance, setMaxDeliveryDistance] = useState(DEFAULT_MAX_DELIVERY_DISTANCE);

    // Payment State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState('');
    const [currentRef, setCurrentRef] = useState('');
    const [currentOrderId, setCurrentOrderId] = useState('');
    const [paymentError, setPaymentError] = useState<string | null>(null);

    // Membership Verification State
    const [membershipModalVisible, setMembershipModalVisible] = useState(false);
    const [membershipInput, setMembershipInput] = useState('');
    const [membershipVerifying, setMembershipVerifying] = useState(false);
    const [membershipError, setMembershipError] = useState<string | null>(null);
    const [membershipVerified, setMembershipVerified] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchCheckoutData();
        }, [])
    );

    // Fetch Delivery Settings and Store Location
    useEffect(() => {
        if (address && (storeId || items[0]?.storeId)) {
            calculateFee();
        }
    }, [address, storeId, items]);

    async function calculateFee() {
        setCalculatingFee(true);
        try {
            const finalStoreId = storeId || items[0]?.storeId;
            if (!finalStoreId || !address?.lat || !address?.lng) {
                setDeliveryFee(0);
                return;
            }

            // 1. Fetch Admin Settings
            const { data: settingsData } = await supabase
                .from('settings')
                .select('key, value')
                .in('key', ['delivery_base_rate', 'delivery_threshold_km', 'delivery_extended_price', 'max_delivery_distance_km']);

            let baseRate = 30;
            let threshold = 5;
            let extendedPrice = 2.5;
            let maxDist = DEFAULT_MAX_DELIVERY_DISTANCE;

            if (settingsData) {
                const baseRateSetting = settingsData.find(s => s.key === 'delivery_base_rate');
                const thresholdSetting = settingsData.find(s => s.key === 'delivery_threshold_km');
                const extendedPriceSetting = settingsData.find(s => s.key === 'delivery_extended_price');
                const maxDistSetting = settingsData.find(s => s.key === 'max_delivery_distance_km');

                if (baseRateSetting?.value) baseRate = Number(baseRateSetting.value);
                if (thresholdSetting?.value) threshold = Number(thresholdSetting.value);
                if (extendedPriceSetting?.value) extendedPrice = Number(extendedPriceSetting.value);
                if (maxDistSetting?.value?.km) maxDist = Number(maxDistSetting.value.km);
                else if (maxDistSetting?.value?.value) maxDist = Number(maxDistSetting.value.value); // Legacy migration format
                else if (maxDistSetting?.value && !isNaN(Number(maxDistSetting.value))) maxDist = Number(maxDistSetting.value);
            }

            setMaxDeliveryDistance(maxDist);

            // 2. Fetch Store Location using PostGIS
            const { data: storeData } = await supabase.rpc('get_store_location', {
                store_uuid: finalStoreId
            });

            if (!storeData || !storeData.lat || !storeData.lng) {
                console.error("Store location not found");
                setDeliveryFee(baseRate); // Fallback
                return;
            }

            setStoreLocation({ lat: storeData.lat, lng: storeData.lng });

            // 3. Calculate Distance
            const distanceKm = getDistanceFromLatLonInKm(
                address.lat,
                address.lng,
                storeData.lat,
                storeData.lng
            );

            if (distanceKm === null) {
                console.warn("Could not calculate distance");
                setDeliveryFee(0);
                setCalculatingFee(false);
                return;
            }

            console.log(`Distance: ${distanceKm.toFixed(2)}km, Max: ${maxDist}km`);

            if (distanceKm > maxDist) {
                Alert.alert(
                    "Delivery Unavailable",
                    `This store only delivers within ${maxDist}km. You are ${distanceKm.toFixed(1)}km away.`
                );
                setDeliveryFee(0); // Invalid
                setCalculatingFee(false);
                return;
            }

            // Calculate Fee
            let fee = baseRate;
            if (distanceKm > threshold) {
                fee += (distanceKm - threshold) * extendedPrice;
            }
            setDeliveryFee(Math.round(fee * 100) / 100); // Round to 2 decimals

        } catch (error) {
            console.error('Error calculating delivery fee:', error);
        } finally {
            setCalculatingFee(false);
        }
    }

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

    const finalTotal = cartTotal + deliveryFee;

    async function createPendingOrder() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !address) return null;

        // Get storeId from context or items fallback
        const finalStoreId = storeId || items[0]?.storeId;
        if (!finalStoreId) {
            Alert.alert("Error", "Missing store information.");
            return null;
        }

        const customerAddress = `${address.address_line1}, ${address.city}`;

        // Create Order (Pending Payment)
        const { data: order, error } = await supabase
            .from('orders')
            .insert({
                customer_id: user.id,
                store_id: finalStoreId,
                total_amount: finalTotal,
                status: 'pending',
                paystack_payment_status: 'failed', // Default to failed/init until charged
                delivery_address: customerAddress,
                delivery_location: address.lat && address.lng ? `POINT(${address.lng} ${address.lat})` : null,
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            Alert.alert("Error", "Failed to create order.");
            return null;
        }

        // Create Order Items
        const orderItems = items.map(item => ({
            order_id: order.id,
            menu_item_id: item.id,
            quantity: item.quantity,
            price_at_time: item.price
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            console.error(itemsError);
            return null;
        }

        return order.id;
    }

    // --- Membership Verification ---
    async function checkMembership(): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const finalStoreId = storeId || items[0]?.storeId;
        if (!finalStoreId) return false;

        // Check if already verified for this store
        const { data: existing } = await supabase
            .from('customer_store_memberships')
            .select('id')
            .eq('customer_id', user.id)
            .eq('store_id', finalStoreId)
            .maybeSingle();

        return !!existing;
    }

    async function verifyMembershipNumber() {
        setMembershipVerifying(true);
        setMembershipError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not logged in');

            const finalStoreId = storeId || items[0]?.storeId;
            if (!finalStoreId) throw new Error('Missing store ID');

            // Get the store's owner_id
            const { data: store } = await supabase
                .from('stores')
                .select('owner_id')
                .eq('id', finalStoreId)
                .single();

            if (!store) throw new Error('Store not found');

            // Check membership number against store_members
            const { data: member } = await supabase
                .from('store_members')
                .select('id, membership_number')
                .eq('store_owner_id', store.owner_id)
                .eq('membership_number', membershipInput.trim())
                .maybeSingle();

            if (!member) {
                setMembershipError('Membership number not found. Please register with this store or contact them for your membership number.');
                setMembershipVerifying(false);
                return;
            }

            // Save verified membership
            const { error: insertError } = await supabase
                .from('customer_store_memberships')
                .insert({
                    customer_id: user.id,
                    store_id: finalStoreId,
                    membership_number: membershipInput.trim(),
                });

            if (insertError) {
                console.error('Failed to save membership:', insertError);
                // unique_usage constraint violation
                if (insertError.code === '23505') {
                    // Check if it's the SAME user (re-verification) or DIFFERENT user
                    if (insertError.message?.includes('customer_store_memberships_unique')) {
                        // This is the (customer_id, store_id) constraint -> customer already verified
                        // We can just proceed
                        setMembershipVerified(true);
                        setMembershipModalVisible(false);
                        setMembershipInput('');
                        initiatePayment();
                        return;
                    } else {
                        // This must be the (store_id, membership_number) constraint -> used by someone else
                        throw new Error('This membership number has already been used by another account.');
                    }
                } else {
                    throw insertError;
                }
            }

            // Success!
            setMembershipVerified(true);
            setMembershipModalVisible(false);
            setMembershipInput('');

            // Now proceed to payment
            initiatePayment();

        } catch (e: any) {
            console.error('Membership verification error:', e);
            setMembershipError(e.message || 'Verification failed. Please try again.');
        } finally {
            setMembershipVerifying(false);
        }
    }

    async function handlePayNow() {
        if (!address) {
            Alert.alert('Address Required', 'Please set a delivery address first.');
            return;
        }
        if (finalTotal <= 0) {
            Alert.alert('Invalid Amount', 'Cart total cannot be zero.');
            return;
        }

        // Check membership first
        const isVerified = membershipVerified || await checkMembership();
        if (!isVerified) {
            setMembershipModalVisible(true);
            return;
        }

        initiatePayment();
    }

    async function initiatePayment() {
        if (!address) {
            Alert.alert('Address Required', 'Please set a delivery address first.');
            return;
        }

        if (finalTotal <= 0) {
            Alert.alert('Invalid Amount', 'Cart total cannot be zero.');
            return;
        }

        if (processing) return;
        setProcessing(true);
        setPaymentError(null); // Clear previous errors

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert("Error", "Please login properly.");
                setProcessing(false);
                return;
            }

            // 1. Create Order First
            const orderId = await createPendingOrder();
            if (!orderId) {
                setProcessing(false);
                return;
            }
            setCurrentOrderId(orderId);

            console.log('Initiating payment with payload:', {
                email: user.email,
                amount: finalTotal,
                typeOfAmount: typeof finalTotal,
                orderId
            });

            // Ensure we have an email (Paystack requires it)
            const paystackEmail = user.email || `customer-${user.id}@420connect.app`;

            // 2. Call Backend to Charge (Using fetch for debugging)
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error("Missing Supabase configuration");
            }

            console.log('Sending request to:', `${supabaseUrl}/functions/v1/paystack-charge`);

            const response = await fetch(`${supabaseUrl}/functions/v1/paystack-charge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}` // Force Anon Key (like curl)
                },
                body: JSON.stringify({
                    email: paystackEmail,
                    amount: finalTotal,
                    metadata: {
                        order_id: orderId,
                        custom_fields: [
                            { display_name: "Order ID", variable_name: "order_id", value: orderId }
                        ]
                    }
                })
            });

            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("Failed to parse response:", responseText);
                throw new Error("Invalid response from server: " + responseText);
            }

            if (!response.ok || !data.success) {
                console.error('Payment Error Details (Native Fetch):', {
                    status: response.status,
                    body: data
                });
                throw new Error(data?.error || data?.message || "Payment request failed");
            }

            const { authorization_url, reference, status } = data.data;
            setCurrentRef(reference);

            // Update Order with Reference so webhooks/refunds can find it
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    paystack_reference: reference
                })
                .eq('id', orderId);

            if (updateError) {
                console.error("Failed to save reference to order:", updateError);
                // Non-critical (?) but hampers tracking. Log it.
            }

            if (status === 'success') {
                // Immediate success (e.g. saved card)
                handlePaymentSuccess(reference, orderId);
            } else if (authorization_url) {
                // Need 3DS/Auth
                setPaymentUrl(authorization_url);
                setPaymentModalVisible(true);
            } else {
                throw new Error("Unexpected payment state");
            }

        } catch (e: any) {
            console.error("Payment Error:", e);
            const errorMessage = e.message || "Could not start payment.";

            if (errorMessage.toLowerCase().includes('jwt') || errorMessage.toLowerCase().includes('session')) {
                Alert.alert("Session Expired", "Please login again to continue.", [
                    { text: "OK", onPress: () => router.replace('/auth') }
                ]);
                return;
            }

            // Just show the string message
            setPaymentError(errorMessage);
            Alert.alert("Payment Error", "See details on screen");
            setProcessing(false);
        }
    }

    // Polling for Verification
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (paymentModalVisible && currentRef) {
            interval = setInterval(async () => {
                try {
                    // Use native fetch to verify (using Anon Key)
                    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

                    if (!supabaseUrl || !supabaseAnonKey) return;

                    const res = await fetch(`${supabaseUrl}/functions/v1/paystack-verify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseAnonKey}`
                        },
                        body: JSON.stringify({ reference: currentRef })
                    });

                    const data = await res.json();

                    if (data.success && data.status === 'success') {
                        console.log('Payment Verified via Polling for ref:', currentRef);
                        handlePaymentSuccess(currentRef, currentOrderId);
                        clearInterval(interval);
                    }
                } catch (e) {
                    // Silent fail on polling errors, just retry
                    console.log('Polling verify error (ignoring):', e);
                }
            }, 3000); // Check every 3 seconds
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [paymentModalVisible, currentRef, currentOrderId]);

    async function handlePaymentSuccess(reference: string, orderId: string) {
        if (!processing) setProcessing(true); // Ensure loading state
        setPaymentModalVisible(false);

        // Navigate to Finding Store
        clearCart();
        router.replace({
            pathname: '/finding-store',
            params: { orderId, reference }
        });
        setProcessing(false);
    }

    // WebView Navigation Handler
    const handleWebViewNavigationStateChange = (newNavState: any) => {
        const { url } = newNavState;
        console.log('WebView Nav:', url);

        // Check for success/callback URL
        if (url.includes('tritonCheckout') || url.includes('success') || url.includes('standard.paystack.co/close') || url.includes('420connect.app/payment/success')) {
            handlePaymentSuccess(currentRef, currentOrderId);
            return false;
        }
        if (url.includes('cancel') || (url === 'https://standard.paystack.co/close' && url.includes('popup=true'))) {
            // handle cancel logic if needed
        }
    };

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

                        {/* Subtotal */}
                        <View style={[styles.summaryRow, { marginBottom: 4 }]}>
                            <Text style={styles.summaryItemText}>Subtotal</Text>
                            <Text style={styles.summaryPrice}>R{cartTotal.toFixed(2)}</Text>
                        </View>

                        {/* Delivery Fee */}
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryItemText}>Delivery Fee</Text>
                            {calculatingFee ? (
                                <ActivityIndicator size="small" color="#10b981" />
                            ) : (
                                <Text style={styles.summaryPrice}>R{deliveryFee.toFixed(2)}</Text>
                            )}
                        </View>

                        <View style={styles.totalContainer}>
                            {paymentError && (
                                <View style={{ padding: 10, backgroundColor: '#ffeba1', marginBottom: 10, borderRadius: 8 }}>
                                    <Text style={{ color: 'red', fontSize: 12 }}>{paymentError}</Text>
                                </View>
                            )}
                            <View style={styles.row}>
                                <Text style={styles.totalLabel}>Total</Text>
                                <Text style={styles.totalValue}>R{finalTotal.toFixed(2)}</Text>
                            </View>
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
                    testID="pay-button"
                    style={[styles.payButton, (!address || processing) && styles.payButtonDisabled]}
                    onPress={handlePayNow}
                    disabled={!address || processing}
                >
                    {processing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <View style={styles.payButtonContent}>
                            <Text style={styles.payButtonText}>Pay R{finalTotal.toFixed(2)}</Text>
                            <ChevronRight size={20} color="white" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Membership Verification Modal */}
            <Modal
                visible={membershipModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setMembershipModalVisible(false);
                    setMembershipError(null);
                    setMembershipInput('');
                }}
            >
                <View style={membershipStyles.overlay}>
                    <View style={membershipStyles.modal}>
                        <View style={membershipStyles.header}>
                            <Users size={28} color="#10b981" />
                            <Text style={membershipStyles.title}>Membership Verification</Text>
                            <Text style={membershipStyles.subtitle}>
                                Enter your membership number for this store to proceed with your order.
                            </Text>
                        </View>

                        <TextInput
                            style={membershipStyles.input}
                            value={membershipInput}
                            onChangeText={(text) => {
                                setMembershipInput(text);
                                setMembershipError(null);
                            }}
                            placeholder="Enter membership number"
                            placeholderTextColor="#64748b"
                            autoCapitalize="characters"
                            autoFocus={true}
                        />

                        {membershipError && (
                            <Text style={membershipStyles.error}>{membershipError}</Text>
                        )}

                        <TouchableOpacity
                            style={[
                                membershipStyles.verifyButton,
                                (!membershipInput.trim() || membershipVerifying) && membershipStyles.verifyButtonDisabled
                            ]}
                            onPress={verifyMembershipNumber}
                            disabled={!membershipInput.trim() || membershipVerifying}
                        >
                            {membershipVerifying ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text style={membershipStyles.verifyButtonText}>Verify & Continue</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={membershipStyles.cancelButton}
                            onPress={() => {
                                setMembershipModalVisible(false);
                                setMembershipError(null);
                                setMembershipInput('');
                            }}
                        >
                            <Text style={membershipStyles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Payment Modal */}
            <Modal
                visible={paymentModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                    setPaymentModalVisible(false);
                    setProcessing(false);
                }}
            >
                <View style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: 40 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 10 }}>
                        <TouchableOpacity onPress={() => {
                            setPaymentModalVisible(false);
                            setProcessing(false);
                        }}>
                            <X size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                    {paymentUrl ? (
                        <WebView
                            source={{ uri: paymentUrl }}
                            onNavigationStateChange={handleWebViewNavigationStateChange}
                            style={{ flex: 1 }}
                        />
                    ) : null}
                </View>
            </Modal>
        </View>
    );
}

export default function CheckoutScreen() {
    return <CheckoutContent />;
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
        padding: 5,
    },
    payButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalContainer: {
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 16,
        marginTop: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});

const membershipStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 28,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#334155',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 12,
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    input: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 16,
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 1,
        borderWidth: 1,
        borderColor: '#334155',
        textAlign: 'center',
        marginBottom: 16,
    },
    error: {
        color: '#f87171',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 18,
    },
    verifyButton: {
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    verifyButtonDisabled: {
        backgroundColor: '#334155',
        opacity: 0.6,
    },
    verifyButtonText: {
        color: 'black',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#94a3b8',
        fontSize: 14,
    },
});
