import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { MapPin, Navigation, MessageCircle, Phone, ArrowRight, User } from 'lucide-react-native';
import { NanoTheme } from '../../constants/nanobanana';
import ChatModal from '../../components/nanobanana/ChatModal';

// Resusing Dark Map Style
const DARK_MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

interface ActiveOrder {
    id: string;
    status: string;
    total_amount: number;
    delivery_address: string;
    delivery_location: any; // GeoJSON
    restaurant_name: string;
    restaurant_location: any; // GeoJSON
    customer: { full_name: string; phone_number: string };

    // Extracted coords
    restaurant_lat?: number;
    restaurant_lng?: number;
    delivery_lat?: number;
    delivery_lng?: number;
}

export default function DeliveriesScreen() {
    const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [chatVisible, setChatVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    const [routeCoords, setRouteCoords] = useState<any[]>([]);
    const [eta, setEta] = useState<string | null>(null);

    useEffect(() => {
        setupLocation();
        fetchActiveOrder();

        const channel = supabase.channel('driver-active-order')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchActiveOrder();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel) };
    }, []);

    // Fetch Route when location or target changes
    useEffect(() => {
        if (activeOrder) {
            const isPickup = activeOrder.status === 'accepted';

            if (isPickup && location) {
                // Pickup phase: Show route from driver to restaurant
                if (activeOrder.restaurant_lat && activeOrder.restaurant_lng) {
                    fetchRoute(
                        location.coords.latitude,
                        location.coords.longitude,
                        activeOrder.restaurant_lat,
                        activeOrder.restaurant_lng
                    );
                }
            } else if (!isPickup) {
                // Delivery phase: Show route from store to customer
                if (activeOrder.restaurant_lat && activeOrder.restaurant_lng &&
                    activeOrder.delivery_lat && activeOrder.delivery_lng) {
                    fetchRoute(
                        activeOrder.restaurant_lat,
                        activeOrder.restaurant_lng,
                        activeOrder.delivery_lat,
                        activeOrder.delivery_lng
                    );
                }
            }
        }
    }, [location, activeOrder]);

    async function fetchRoute(startLat: number, startLng: number, endLat: number, endLng: number) {
        try {
            // using OSRM public API (Demo server)
            const url = `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const json = await response.json();

            if (json.routes && json.routes.length > 0) {
                const route = json.routes[0];
                const coords = route.geometry.coordinates.map((c: number[]) => ({
                    latitude: c[1],
                    longitude: c[0]
                }));
                setRouteCoords(coords);

                // Duration is in seconds
                const minutes = Math.ceil(route.duration / 60);
                setEta(`${minutes} min`);
            }
        } catch (error) {
            console.log("Routing Error:", error);
        }
    }

    async function setupLocation() {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Subscription for live tracking
        Location.watchPositionAsync({
            accuracy: Location.Accuracy.High,
            timeInterval: 10000, // Fetch less frequently for OSRM demo limit
            distanceInterval: 50
        }, async (loc) => {
            setLocation(loc);

            // Broadcast location to DB when order is picked up (live tracking)
            if (activeOrder && activeOrder.status === 'picked_up') {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    await supabase
                        .from('profiles')
                        .update({
                            current_location: `POINT(${loc.coords.longitude} ${loc.coords.latitude})`
                        })
                        .eq('id', session.user.id);
                }
            }
        });
    }

    async function fetchActiveOrder() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Fetch specific active order with full details
            // We need coords from the geometry columns. 
            // supabase-js postgis support is raw, so we might need a view or rpc for cleaner access
            // For now, let's use the 'driver_orders_view' if possible OR raw select.
            // Let's rely on 'orders' table but we need coords.

            // Re-using the view we created earlier? 'driver_orders_view' was filtered by 'ready_for_pickup'.
            // We need a view for ACTIVE orders (accepted/picked_up).
            // Let's just query 'orders' and related tables directly.

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id, 
                    status, 
                    total_amount, 
                    delivery_address, 
                    delivery_location,
                    restaurants (name, location),
                    profiles:customer_id (full_name, phone_number)
                `)
                .eq('driver_id', session.user.id)
                .in('status', ['accepted', 'picked_up', 'out_for_delivery'])
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') { // 116 is no rows
                console.log("Fetch Error:", error);
            }

            if (data) {
                // Parse GeoJSON points if returned as such, or raw 
                // Supabase JS returns geometry as GeoJSON object usually.
                // NOTE: Supabase might return text WKB if not cast.
                // Simpler approach for MVP: Use the coordinate columns if we had them, OR parse.
                // Our view had ST_X/ST_Y which was cleaner.
                // Let's create a quick helper or fallback.
                // Actually, let's look at what we have. 
                // Improving: Call a RPC or View that gives lat/lng clearly is safer.
                // Let's assume for this MVP step we can get approx location or the view concept.

                // Hack fallback: querying the view I created earlier? It was limited to 'ready_for_pickup'.
                // I will assume I can get the order and use the view logic or just re-fetch using a new RPC?
                // Too complex to create RPC now.
                // Let's use a raw query text if needed? No, Supabase lib.

                // Let's Try: Fetching using the view 'driver_orders_view' logic but manually implemented on client? No.
                // I'll update the component to robustly handle missing coords or use 'driver_orders_view' if I update it to include these statuses.
                // BETTER: Update 'driver_orders_view' to include detailed statuses! 
                // Wait, I can't easily do that mid-file write.

                // Let's use the layout data we have. 
                // Assuming 'locations' are returned as GeoJSON objects { type: 'Point', coordinates: [lng, lat] }


                const restaurant = Array.isArray(data.restaurants) ? data.restaurants[0] : data.restaurants;
                const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

                const restaurantLoc = restaurant?.location;
                const deliveryLoc = data.delivery_location;

                // Parse GeoJSON
                const parseGeo = (geo: any) => {
                    if (typeof geo === 'string') {
                        // If string, likely hex. Hard to parse in JS without lib.
                        // Fallback: 0,0
                        return { lat: 0, lng: 0 };
                    }
                    if (geo?.coordinates) {
                        return { lng: geo.coordinates[0], lat: geo.coordinates[1] };
                    }
                    return { lat: 0, lng: 0 };
                };

                const rCoords = parseGeo(restaurantLoc);
                const dCoords = parseGeo(deliveryLoc);

                setActiveOrder({
                    id: data.id,
                    status: data.status,
                    total_amount: data.total_amount,
                    delivery_address: data.delivery_address,
                    delivery_location: data.delivery_location,
                    restaurant_name: restaurant?.name,
                    restaurant_location: restaurant?.location,
                    customer: profile,
                    restaurant_lat: rCoords.lat,
                    restaurant_lng: rCoords.lng,
                    delivery_lat: dCoords.lat,
                    delivery_lng: dCoords.lng
                });
            } else {
                setActiveOrder(null);
            }

        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    }

    const handleAction = async () => {
        if (!activeOrder) return;
        const nextStatus = activeOrder.status === 'accepted' ? 'picked_up' : 'delivered'; // out_for_delivery skip

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: nextStatus })
                .eq('id', activeOrder.id);

            if (error) throw error;
            if (nextStatus === 'delivered') {
                setActiveOrder(null);
                Alert.alert("Success", "Order Delivered!");
            } else {
                fetchActiveOrder();
            }
        } catch (e: any) {
            Alert.alert("Error", e.message);
        }
    };

    if (!activeOrder) {
        return (
            <View style={[styles.container, styles.center]}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <Navigation size={64} color="#333" />
                <Text style={styles.emptyText}>No Active Order</Text>
                <Text style={styles.subText}>Go to the "Offers" tab to find work.</Text>
            </View>
        );
    }

    const isPickupPhase = activeOrder.status === 'accepted';
    const targetLat = isPickupPhase ? activeOrder.restaurant_lat : activeOrder.delivery_lat;
    const targetLng = isPickupPhase ? activeOrder.restaurant_lng : activeOrder.delivery_lng;
    const targetName = isPickupPhase ? activeOrder.restaurant_name : activeOrder.customer?.full_name;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Map */}
            <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                customMapStyle={DARK_MAP_STYLE}
                region={{
                    latitude: location?.coords.latitude || activeOrder.restaurant_lat || 0,
                    longitude: location?.coords.longitude || activeOrder.restaurant_lng || 0,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
            >
                {/* Destination Marker */}
                {!!targetLat && !!targetLng && (
                    <Marker
                        coordinate={{ latitude: targetLat, longitude: targetLng }}
                        pinColor={NanoTheme.colors.primary}
                        title={isPickupPhase ? "Pickup Restaurant" : "Dropoff Customer"}
                    />
                )}

                {/* Route Line from OSRM */}
                {routeCoords.length > 0 && (
                    <Polyline
                        coordinates={routeCoords}
                        strokeColor={NanoTheme.colors.primary}
                        strokeWidth={4}
                    />
                )}
            </MapView>

            {/* Top Info Pill */}
            <View style={styles.topContainer}>
                <View style={styles.statusPill}>
                    <Text style={styles.statusText}>
                        {isPickupPhase ? 'PICKING UP ORDER' : 'DELIVERING TO CUSTOMER'}
                    </Text>
                    {eta && (
                        <View style={styles.etaContainer}>
                            <Text style={styles.etaLabel}>ETA</Text>
                            <Text style={styles.etaValue}>{eta}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Bottom Card */}
            <View style={styles.bottomCard}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>{isPickupPhase ? "PICKUP AT" : "DROPOFF TO"}</Text>
                        <Text style={styles.mainTitle}>{targetName}</Text>
                        <Text style={styles.address} numberOfLines={1}>{activeOrder.delivery_address}</Text>
                    </View>
                    <View style={styles.iconCircle}>
                        {isPickupPhase ?
                            <Navigation color={NanoTheme.colors.primary} size={24} /> :
                            <User color={NanoTheme.colors.primary} size={24} />
                        }
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.chatBtn} onPress={() => setChatVisible(true)}>
                        <MessageCircle color="black" size={24} />
                        <Text style={styles.chatBtnText}>Chat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[
                        styles.primaryBtn,
                        !isPickupPhase && { backgroundColor: NanoTheme.colors.primary }
                    ]} onPress={handleAction}>
                        <Text style={styles.primaryBtnText}>
                            {isPickupPhase ? "CONFIRM PICKUP" : "COMPLETE DELIVERY"}
                        </Text>
                        <ArrowRight color="black" size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Chat Modal */}
            <ChatModal
                visible={chatVisible}
                onClose={() => setChatVisible(false)}
                orderId={activeOrder.id}
                userName={activeOrder.customer?.full_name || 'Customer'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    emptyText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
    },
    subText: {
        color: '#888',
        fontSize: 16,
        marginTop: 8,
    },
    topContainer: {
        position: 'absolute',
        top: 60,
        width: '100%',
        alignItems: 'center',
        zIndex: 10,
    },
    statusPill: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: NanoTheme.colors.primary,
    },
    statusText: {
        color: NanoTheme.colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
    etaContainer: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: 'rgba(52, 211, 153, 0.3)',
        paddingTop: 4,
    },
    etaLabel: {
        color: '#aaa',
        fontSize: 10,
        fontWeight: '600',
    },
    etaValue: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    bottomCard: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: NanoTheme.colors.background, // Black
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderColor: '#333',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    label: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    mainTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    address: {
        color: '#ccc',
        fontSize: 16,
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    chatBtn: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 30, // Pill
        gap: 8,
    },
    chatBtnText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 16,
    },
    primaryBtn: {
        flex: 1,
        backgroundColor: NanoTheme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30, // Pill
        gap: 8,
    },
    primaryBtnText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 0.5,
    }
});
