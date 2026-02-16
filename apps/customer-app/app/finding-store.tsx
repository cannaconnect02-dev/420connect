import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    Easing,
    runOnJS,
    cancelAnimation,
} from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { Store, XCircle } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function FindingStoreScreen() {
    const router = useRouter();
    const { orderId, reference } = useLocalSearchParams();
    const [duration, setDuration] = useState<number>(300); // Default 5 mins
    const [timeLeft, setTimeLeft] = useState(300);
    const [loading, setLoading] = useState(true);
    const progress = useSharedValue(1);

    // Circle Config
    const RADIUS = 120;
    const STROKE_WIDTH = 15;
    const CIRCLE_LENGTH = 2 * Math.PI * RADIUS;

    useEffect(() => {
        let cleanupFn: (() => void) | undefined;

        const init = async () => {
            const cleanup = await fetchSettings();
            if (cleanup) cleanupFn = cleanup;
        };
        init();

        // Disable back button
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

        // Subscribe to Order Updates
        console.log("Subscribing to order:", orderId);
        const subscription = supabase
            .channel(`order-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderId}`
                },
                (payload) => {
                    console.log("Order update received:", payload);
                    const newStatus = payload.new.status;
                    const ignoredStatuses = ['pending', 'cancelled', 'rejected'];
                    if (newStatus && !ignoredStatuses.includes(newStatus)) {
                        handleStoreFound();
                        if (cleanupFn) cleanupFn(); // Stop polling/timer
                    }
                }
            )
            .subscribe((status, err) => {
                console.log("Subscription status:", status, err);
            });

        return () => {
            backHandler.remove();
            supabase.removeChannel(subscription);
            if (cleanupFn) cleanupFn();
        };
    }, []);

    const fetchSettings = async () => {
        // 1. Get Timer Settings
        const { data } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'matching_window_seconds')
            .single();

        const seconds = data?.value?.seconds ? Number(data.value.seconds) : 300;
        setDuration(seconds);
        setTimeLeft(seconds);
        setLoading(false);

        // 2. Initial Status Check (Race condition fix)
        const { data: order } = await supabase
            .from('orders')
            .select('status')
            .eq('id', orderId)
            .single();

        const ignoredStatuses = ['pending', 'cancelled', 'rejected'];
        if (order && !ignoredStatuses.includes(order.status)) {
            handleStoreFound();
            return; // Don't start timer if already accepted
        }

        // Start Animation
        progress.value = withTiming(0, {
            duration: seconds * 1000,
            easing: Easing.linear
        }, (finished) => {
            if (finished) {
                runOnJS(handleTimeout)();
            }
        });

        // Start Text Timer
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // handleTimeout is called by animation callback
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Polling as Backup (every 5s)
        const pollingInterval = setInterval(async () => {
            console.log("Polling order status...");
            const { data: order } = await supabase
                .from('orders')
                .select('status')
                .eq('id', orderId)
                .single();

            const ignoredStatuses = ['pending', 'cancelled', 'rejected'];
            if (order && !ignoredStatuses.includes(order.status)) {
                console.log("Order accepted (via polling):", order.status);
                runOnJS(handleStoreFound)();
                // Clear intervals immediately
                clearInterval(interval);
                clearInterval(pollingInterval);
                cancelAnimation(progress);
                // Also clean up main interval return
            }
        }, 5000);

        // Store polling interval for cleanup too (hacky but effective)
        // Ideally use a ref, but scoped variable works here if we merge logic
        return () => {
            clearInterval(interval);
            clearInterval(pollingInterval);
        };
    };

    const handleStoreFound = () => {
        // Stop everything
        cancelAnimation(progress);

        Alert.alert("Store Found!", "Your order has been accepted.", [
            { text: "View Order", onPress: () => router.replace(`/order/${orderId}`) }
        ]);
    };

    const executeRefund = async (reason: 'timeout' | 'cancel') => {
        console.log(`Processing refund due to: ${reason}`);
        try {
            // Use native fetch to bypass invoke/JWT issues
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing Supabase config");

            const res = await fetch(`${supabaseUrl}/functions/v1/paystack-refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`
                },
                body: JSON.stringify({ reference })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                console.error("Refund API Error:", data);
                throw new Error(data?.error || data?.message || "Refund failed");
            }

            if (reason === 'timeout') {
                Alert.alert(
                    "No Store Found",
                    "We couldn't find a store in time. Your payment has been refunded.",
                    [{ text: "OK", onPress: () => router.replace('/(tabs)') }]
                );
            } else {
                Alert.alert(
                    "Order Cancelled",
                    "Your order has been cancelled and payment refunded.",
                    [{ text: "OK", onPress: () => router.replace('/(tabs)') }]
                );
            }

        } catch (e: any) {
            console.error("Refund Exception:", e);
            Alert.alert("Refund Issue", `We could not process the automated refund (${e.message}). Please contact support with Order ID: ${orderId}`);
            router.replace('/(tabs)');
        }
    };

    const handleTimeout = () => {
        executeRefund('timeout');
    };

    const handleCancel = () => {
        executeRefund('cancel');
    };

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: CIRCLE_LENGTH * (1 - progress.value),
    }));

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (loading) return (
        <View style={styles.container}>
            <Text style={styles.text}>Preparing...</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Finding a Store...</Text>
                <Text style={styles.subtitle}>Please wait while we connect you to a nearby store.</Text>

                <View style={styles.timerContainer}>
                    <Svg width={RADIUS * 2 + STROKE_WIDTH} height={RADIUS * 2 + STROKE_WIDTH}>
                        <Circle
                            cx={RADIUS + STROKE_WIDTH / 2}
                            cy={RADIUS + STROKE_WIDTH / 2}
                            r={RADIUS}
                            stroke="#334155"
                            strokeWidth={STROKE_WIDTH}
                        />
                        <AnimatedCircle
                            cx={RADIUS + STROKE_WIDTH / 2}
                            cy={RADIUS + STROKE_WIDTH / 2}
                            r={RADIUS}
                            stroke="#10b981"
                            strokeWidth={STROKE_WIDTH}
                            strokeDasharray={CIRCLE_LENGTH}
                            animatedProps={animatedProps}
                            strokeLinecap="round"
                            rotation="-90"
                            origin={`${RADIUS + STROKE_WIDTH / 2}, ${RADIUS + STROKE_WIDTH / 2}`}
                        />
                    </Svg>
                    <View style={styles.timerTextContainer}>
                        <Store size={40} color="#10b981" style={{ marginBottom: 10 }} />
                        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                        Alert.alert("Cancel Order?", "This will refund your payment.", [
                            { text: "No", style: "cancel" },
                            {
                                text: "Yes, Cancel", onPress: () => {
                                    progress.value = 0;
                                    handleCancel();
                                }
                            }
                        ])
                    }}
                >
                    <XCircle size={20} color="#ef4444" />
                    <Text style={styles.cancelText}>Cancel Order</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 40,
    },
    timerContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    timerTextContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    text: {
        color: 'white',
        fontSize: 18,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    cancelText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    }
});
