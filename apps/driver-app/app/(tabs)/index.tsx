import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, Platform, Alert, TouchableOpacity, StatusBar } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { MapPin, Navigation } from 'lucide-react-native';
import { NanoTheme } from '../../constants/nanobanana';


// Dark Mode Map Style
const DARK_MAP_STYLE = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#212121" }]
    },
    {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#212121" }]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "administrative.country",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "administrative.land_parcel",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#bdbdbd" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#181818" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#1b1b1b" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [{ "color": "#2c2c2c" }]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#8a8a8a" }]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [{ "color": "#373737" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#3c3c3c" }]
    },
    {
        "featureType": "road.highway.controlled_access",
        "elementType": "geometry",
        "stylers": [{ "color": "#4e4e4e" }]
    },
    {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "featureType": "transit",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#000000" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#3d3d3d" }]
    }
];

interface OrderMarker {
    id: string;
    status: string;
    total_amount: number;
    lat: number;
    lng: number;
    delivery_address: string;
    restaurant_name: string;
    restaurant_lat: number;
    restaurant_lng: number;
    restaurant_address: string;
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

// Driver Payout Calculation
// Base Fare: R30 (covers first 5km)
// Long Distance Rate: R2.50 per km after 5km
function calculateDriverPayout(distanceKm: number): number {
    const BASE_FARE = 30;
    const BASE_KM = 5;
    const RATE_PER_KM = 2.5;

    if (distanceKm <= BASE_KM) return BASE_FARE;
    return BASE_FARE + ((distanceKm - BASE_KM) * RATE_PER_KM);
}

export default function OrderOfferScreen() {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [offeredOrder, setOfferedOrder] = useState<OrderMarker | null>(null); // Only show ONE
    const [errorMsg, setErrorMsg] = useState('');
    const mapRef = React.useRef<MapView>(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        })();

        // Listen for Offers
        const channel = supabase.channel('driver-radar-v1')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                if (isOnline) fetchNextOffer();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel) };
    }, [isOnline]); // Refetch if online status changes

    useEffect(() => {
        if (isOnline) {
            fetchNextOffer();
        } else {
            setOfferedOrder(null);
        }
    }, [isOnline]);

    async function fetchNextOffer() {
        // Fetch orders that are ready for driver pickup (not yet assigned)
        // Using direct query instead of view for more control
        console.log('Fetching available orders for driver...');

        const { data, error } = await supabase
            .from('orders')
            .select(`
                id,
                status,
                total_amount,
                delivery_address,
                restaurants (
                    id,
                    name,
                    address,
                    latitude,
                    longitude
                )
            `)
            .in('status', ['ready', 'ready_for_pickup'])
            .is('driver_id', null) // Only unassigned orders
            .limit(1);

        console.log('Orders query result:', { data, error });

        if (error) {
            console.log('Error fetching orders:', error);
            return;
        }

        if (data && data.length > 0) {
            const order = data[0];
            // Supabase returns foreign key relation - can be object or array depending on schema
            const restaurantData = order.restaurants as any;
            const restaurant = Array.isArray(restaurantData) ? restaurantData[0] : restaurantData;

            // Transform to match expected format
            const offerData: OrderMarker = {
                id: order.id,
                status: order.status,
                total_amount: order.total_amount,
                lat: 0, // Will be populated from order delivery_location if available
                lng: 0,
                delivery_address: order.delivery_address,
                restaurant_name: restaurant?.name || 'Unknown Store',
                restaurant_lat: restaurant?.latitude || 0,
                restaurant_lng: restaurant?.longitude || 0,
                restaurant_address: restaurant?.address || 'Address unavailable',
            };

            console.log('Offering order:', offerData);
            setOfferedOrder(offerData);
        } else {
            console.log('No orders available for pickup');
            setOfferedOrder(null);
        }
    }

    const handleAccept = async () => {
        if (!offeredOrder) {
            console.log('No offered order to accept');
            return;
        }
        console.log('Accepting order:', offeredOrder.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.log('No session found');
                Alert.alert("Error", "You must be logged in to accept orders");
                return;
            }
            console.log('Driver ID:', session.user.id);

            const { data, error } = await supabase
                .from('orders')
                .update({
                    status: 'picked_up',
                    driver_id: session.user.id
                })
                .eq('id', offeredOrder.id)
                .select();

            console.log('Update result:', { data, error });

            if (error) throw error;

            Alert.alert("ACCEPTED", "Head to the restaurant!");
            setOfferedOrder(null); // Clear offer (it moves to Deliveries tab)
        } catch (e: any) {
            console.log('Accept error:', e);
            Alert.alert("Error", e.message);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Map Background */}
            {location ? (
                <MapView
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    customMapStyle={DARK_MAP_STYLE}
                    showsUserLocation={true}
                    userInterfaceStyle="dark"
                    onMapReady={() => {
                        // If we have an offer with valid coords, zoom to fit points
                        if (offeredOrder && mapRef.current &&
                            offeredOrder.restaurant_lat && offeredOrder.restaurant_lng) {
                            const coordsToFit = [
                                { latitude: offeredOrder.restaurant_lat, longitude: offeredOrder.restaurant_lng },
                                { latitude: location.coords.latitude, longitude: location.coords.longitude }
                            ];
                            // Add customer location only if valid
                            if (offeredOrder.lat && offeredOrder.lng) {
                                coordsToFit.push({ latitude: offeredOrder.lat, longitude: offeredOrder.lng });
                            }
                            mapRef.current.fitToCoordinates(coordsToFit, {
                                edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
                                animated: true,
                            });
                        }
                    }}
                    ref={mapRef}
                >
                    {offeredOrder && offeredOrder.restaurant_lat && offeredOrder.restaurant_lng && (
                        <>
                            {/* Restaurant Pin */}
                            <Marker
                                coordinate={{ latitude: offeredOrder.restaurant_lat, longitude: offeredOrder.restaurant_lng }}
                                pinColor={NanoTheme.colors.primary} // Green
                                title="Restaurant"
                            />
                            {/* Customer Pin - only if coordinates exist */}
                            {offeredOrder.lat && offeredOrder.lng && (
                                <Marker
                                    coordinate={{ latitude: offeredOrder.lat, longitude: offeredOrder.lng }}
                                    pinColor="indigo"
                                    title="Customer"
                                />
                            )}
                            {/* Route Line - only if both points exist */}
                            {offeredOrder.lat && offeredOrder.lng && (
                                <Polyline
                                    coordinates={[
                                        { latitude: offeredOrder.restaurant_lat, longitude: offeredOrder.restaurant_lng },
                                        { latitude: offeredOrder.lat, longitude: offeredOrder.lng }
                                    ]}
                                    strokeColor={NanoTheme.colors.primary}
                                    strokeWidth={4}
                                    lineDashPattern={[0]}
                                />
                            )}
                        </>
                    )}
                </MapView>
            ) : (
                <View style={[styles.map, { backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: 'white' }}>Locating...</Text>
                </View>
            )}

            {/* Top Online Toggle Overlay */}
            <View style={styles.topContainer}>
                {!offeredOrder && (
                    <View style={styles.statusPill}>
                        <Text style={[styles.statusText, { color: isOnline ? NanoTheme.colors.primary : '#666' }]}>
                            {isOnline ? 'ONLINE • SCANNING' : 'OFFLINE'}
                        </Text>
                        <Switch
                            trackColor={{ false: "#333", true: NanoTheme.colors.primaryDim }}
                            thumbColor={isOnline ? NanoTheme.colors.primary : "#f4f3f4"}
                            onValueChange={setIsOnline}
                            value={isOnline}
                        />
                    </View>
                )}
            </View>

            {/* Bottom Offer Panel - Only visible if there is an offer */}
            {offeredOrder && (
                <View style={styles.offerPanel}>
                    {/* Header: Restaurant Info */}
                    <View style={styles.restaurantRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionLabel}>PICKUP</Text>
                            <Text style={styles.restaurantName}>{offeredOrder.restaurant_name}</Text>
                            <Text style={styles.addressText}>{offeredOrder.restaurant_address}</Text>
                            <View style={styles.metaRow}>
                                <Text style={styles.metaText}>
                                    {location && offeredOrder.restaurant_lat && offeredOrder.restaurant_lng
                                        ? `${getDistanceFromLatLonInKm(
                                            location.coords.latitude,
                                            location.coords.longitude,
                                            offeredOrder.restaurant_lat,
                                            offeredOrder.restaurant_lng
                                        ).toFixed(1)} km to store`
                                        : (location ? 'Distance unavailable' : 'Calculating...')}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.iconContainer}>
                            <Navigation size={24} color={NanoTheme.colors.primary} />
                        </View>
                    </View>

                    {/* Customer Destination Info */}
                    <View style={[styles.restaurantRow, { marginTop: 10 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionLabel}>DROPOFF</Text>
                            <Text style={styles.restaurantName}>Customer</Text>
                            <Text style={styles.addressText}>{offeredOrder.delivery_address}</Text>
                            <View style={styles.metaRow}>
                                <Text style={[styles.metaText, { color: NanoTheme.colors.primary, fontWeight: 'bold' }]}>
                                    {offeredOrder.restaurant_lat && offeredOrder.restaurant_lng && offeredOrder.lat && offeredOrder.lng
                                        ? `Trip Distance: ${getDistanceFromLatLonInKm(
                                            offeredOrder.restaurant_lat,
                                            offeredOrder.restaurant_lng,
                                            offeredOrder.lat,
                                            offeredOrder.lng
                                        ).toFixed(1)} km`
                                        : 'Trip distance unavailable'}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.iconContainer, { borderColor: '#555' }]}>
                            <MapPin size={24} color={'white'} />
                        </View>
                    </View>

                    {/* Hero: Earnings - Calculated Driver Payout */}
                    <View style={styles.earningsContainer}>
                        <Text style={styles.currencySymbol}>R</Text>
                        <Text style={styles.earningsValue}>
                            {calculateDriverPayout(
                                getDistanceFromLatLonInKm(
                                    offeredOrder.restaurant_lat,
                                    offeredOrder.restaurant_lng,
                                    offeredOrder.lat,
                                    offeredOrder.lng
                                )
                            ).toFixed(2)}
                        </Text>
                    </View>
                    <Text style={styles.earningsLabel}>Potential Earning</Text>

                    {/* Action: Slide to Accept */}
                    <View style={styles.actionContainer}>
                        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
                            <Text style={styles.acceptButtonText}>ACCEPT ORDER</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Decline Button */}
                    <TouchableOpacity style={styles.declineBtn} onPress={() => setOfferedOrder(null)}>
                        <Text style={styles.declineText}>Decline Offer</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NanoTheme.colors.background,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    topContainer: {
        position: 'absolute',
        top: 60,
        width: '100%',
        alignItems: 'center',
        zIndex: 10,
    },
    statusPill: {
        flexDirection: 'row',
        backgroundColor: 'rgba(18, 18, 18, 0.9)',
        borderRadius: 30,
        paddingVertical: 8,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    statusText: {
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
    offerPanel: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: NanoTheme.colors.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        borderTopWidth: 1,
        borderColor: '#222',
    },
    restaurantRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    restaurantName: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 8,
    },
    metaText: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 14,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    earningsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginBottom: 8,
    },
    earningsLabel: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    currencySymbol: {
        color: NanoTheme.colors.primary,
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 8,
        marginRight: 4,
    },
    earningsValue: {
        color: NanoTheme.colors.primary,
        fontSize: 64, // HUGE font for glancing
        fontWeight: '800',
        lineHeight: 70, // Adjust line height to prevent clipping
    },
    actionContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    acceptButton: {
        backgroundColor: NanoTheme.colors.primary,
        width: '100%',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: NanoTheme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    acceptButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 20,
        letterSpacing: 2,
    },
    declineBtn: {
        alignItems: 'center',
        padding: 12,
    },
    declineText: {
        color: NanoTheme.colors.error,
        fontWeight: '600',
    },
    sectionLabel: {
        color: NanoTheme.colors.primary,
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2,
        opacity: 0.8,
    },
    addressText: {
        color: '#ccc',
        fontSize: 14,
        marginBottom: 4,
    }
});
