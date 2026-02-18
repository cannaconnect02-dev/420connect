import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
    ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, Navigation, CheckCircle } from 'lucide-react-native';
import { NanoTheme } from '../constants/nanobanana';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'; // DIRECT IMPORT

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function AddressConfirmationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [address, setAddress] = useState('');
    const [suburb, setSuburb] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

    const placesRef = useRef<any>(null);

    // Initial check logic...
    useEffect(() => {
        console.log('AddressConfirmationScreen mounted');
        console.log('Google Maps API Key Loaded:', !!GOOGLE_PLACES_API_KEY);
        if (GOOGLE_PLACES_API_KEY) {
            console.log('Key prefix:', GOOGLE_PLACES_API_KEY.substring(0, 5) + '...');
        } else {
            console.error('CRITICAL: GOOGLE_PLACES_API_KEY is missing!');
        }

        if (params.editing === 'true' || params.returnUrl) {
            loadExistingAddress();
        } else {
            checkExistingAddress();
        }
    }, [params.editing, params.returnUrl]);

    async function loadExistingAddress() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: addressData } = await supabase
                .from('user_addresses')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_default', true)
                .single();

            if (addressData) {
                setAddress(addressData.address_line1);
                if (placesRef.current) {
                    placesRef.current.setAddressText(addressData.address_line1);
                }
                setSuburb(addressData.suburb || '');
                setCity(addressData.city);
                setPostalCode(addressData.postal_code || '');
                setCoordinates({ lat: addressData.lat, lng: addressData.lng });
            }
        } catch (e) { console.log("Error loading address", e) }
    }

    async function checkExistingAddress() {
        // ... (Keep existing check logic)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('address_confirmed').eq('id', user.id).single();
        if (profile?.address_confirmed) {
            const { data: addressData } = await supabase.from('user_addresses').select('id').eq('user_id', user.id).limit(1);
            if (addressData && addressData.length > 0) router.replace('/(tabs)');
        }
    }

    async function getCurrentLocation() {
        setGettingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please enable location permissions to auto-detect your address.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            setCoordinates({ lat: latitude, lng: longitude });

            const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (result) {
                setAddress(`${result.streetNumber || ''} ${result.street || ''}`.trim() || result.name || '');
                setSuburb(result.district || result.subregion || '');
                setCity(result.city || result.region || '');
                setPostalCode(result.postalCode || '');
            }

            Alert.alert('Location Found', 'Your address has been auto-filled. Please verify and confirm.');
        } catch (error: any) {
            Alert.alert('Error', 'Could not get your location. Please enter manually.');
        } finally {
            setGettingLocation(false);
        }
    }

    // Handle Google Places Selection
    const handlePlaceSelected = (data: any, details: any = null) => {
        if (details) {
            const { geometry, address_components, formatted_address } = details;

            // 1. Set Coordinates
            if (geometry && geometry.location) {
                setCoordinates({
                    lat: geometry.location.lat,
                    lng: geometry.location.lng
                });
            }

            // 2. Parse Address Components
            let streetNumber = '';
            let route = '';
            let sub = '';
            let cty = '';
            let pcode = '';

            address_components.forEach((component: any) => {
                const types = component.types;
                if (types.includes('street_number')) streetNumber = component.long_name;
                if (types.includes('route')) route = component.long_name;
                if (types.includes('sublocality') || types.includes('neighborhood')) sub = component.long_name;
                if (types.includes('locality') || types.includes('administrative_area_level_2')) cty = component.long_name;
                if (types.includes('postal_code')) pcode = component.long_name;
            });

            setAddress(`${streetNumber} ${route}`.trim() || formatted_address.split(',')[0]);
            setSuburb(sub);
            setCity(cty);
            setPostalCode(pcode);
        }
    };

    async function confirmAddress() {
        if (!address.trim() || !city.trim()) {
            Alert.alert('Error', 'Please enter at least your street address and city.');
            return;
        }
        if (!coordinates) {
            Alert.alert('Location Required', 'Please ensure your location is verified (select from dropdown or use current location).');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Unset any existing default addresses
            await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', user.id);

            // 2. Insert new address
            const { error: addressError } = await supabase
                .from('user_addresses')
                .insert({
                    user_id: user.id,
                    address_line1: address,
                    suburb: suburb,
                    city: city,
                    postal_code: postalCode,
                    lat: coordinates.lat,
                    lng: coordinates.lng,
                    is_default: true
                });

            if (addressError) throw addressError;

            // 3. Update profile
            await supabase.from('profiles').update({ address_confirmed: true }).eq('id', user.id);
            await supabase.auth.refreshSession();

            // Navigate
            if (params.returnUrl) {
                router.replace(params.returnUrl as string);
            } else if (params.editing === 'true') {
                router.canGoBack() ? router.back() : router.replace('/(tabs)/profile');
            } else {
                // Default flow: Go to main tabs
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save address');
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" backgroundColor={NanoTheme.colors.background} />
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <MapPin size={40} color={NanoTheme.colors.primary} />
                        </View>
                        <Text style={styles.title}>Confirm Your Address</Text>
                        <Text style={styles.subtitle}>
                            We need your delivery address to show stores within 35km
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.locationButton}
                            onPress={getCurrentLocation}
                            disabled={gettingLocation}
                        >
                            {gettingLocation ? (
                                <ActivityIndicator color={NanoTheme.colors.primary} />
                            ) : (
                                <>
                                    <Navigation size={20} color={NanoTheme.colors.primary} />
                                    <Text style={styles.locationButtonText}>Use Current Location</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or search address</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Google Places Autocomplete Section */}
                        <View style={[styles.inputContainer, { zIndex: 1000 }]}>
                            <Text style={styles.label}>Search Address</Text>
                            {/* Removed fixed height to allow list to grow */}
                            <View style={{ flex: 1 }}>
                                <GooglePlacesAutocomplete
                                    ref={placesRef}
                                    placeholder='Start typing address...'
                                    onPress={handlePlaceSelected}
                                    query={{
                                        key: GOOGLE_PLACES_API_KEY,
                                        language: 'en',
                                        components: 'country:za',
                                    }}
                                    fetchDetails={true}
                                    onFail={(error) => console.error('Google Places Error:', error)}
                                    onNotFound={() => console.log('Google Places: No results found')}
                                    styles={{
                                        textInput: styles.placesInput,
                                        listView: {
                                            ...styles.listView,
                                            position: 'absolute', // Float over other content
                                            top: 50, // Below input
                                            left: 0,
                                            right: 0,
                                            zIndex: 9999, // Ensure on top
                                            elevation: 5, // Android shadow/elevation
                                        },
                                        description: { color: 'white' },
                                        row: { backgroundColor: NanoTheme.colors.backgroundAlt },
                                        separator: { backgroundColor: '#333' },
                                        container: { flex: 0 }, // Prevent taking full screen height
                                    }}
                                    textInputProps={{
                                        placeholderTextColor: NanoTheme.colors.textSecondary,
                                        value: address, // Controlled input
                                        onChangeText: (text) => {
                                            setAddress(text);
                                            console.log('Searching for:', text);
                                        },
                                    }}
                                    enablePoweredByContainer={false}
                                />
                            </View>
                        </View>

                        {/* Manual Overrides / Display */}
                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 2 }]}>
                                <Text style={styles.label}>Suburb</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Suburb"
                                    placeholderTextColor={NanoTheme.colors.textSecondary}
                                    value={suburb}
                                    onChangeText={setSuburb}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 2 }]}>
                                <Text style={styles.label}>City *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="City"
                                    placeholderTextColor={NanoTheme.colors.textSecondary}
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1, marginLeft: 12 }]}>
                                <Text style={styles.label}>Postal Code</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Code"
                                    placeholderTextColor={NanoTheme.colors.textSecondary}
                                    value={postalCode}
                                    onChangeText={setPostalCode}
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>

                        {coordinates && (
                            <View style={styles.coordinatesInfo}>
                                <CheckCircle size={16} color={NanoTheme.colors.primary} />
                                <Text style={styles.coordinatesText}>
                                    Location verified (Lat: {coordinates.lat.toFixed(4)}, Lng: {coordinates.lng.toFixed(4)})
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={confirmAddress}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Saving...' : 'Confirm Address'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NanoTheme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: NanoTheme.colors.primaryDim,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 0, 0.2)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: NanoTheme.colors.text,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: NanoTheme.colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
    card: {
        backgroundColor: NanoTheme.colors.backgroundAlt,
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: NanoTheme.colors.border,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: NanoTheme.colors.primary,
        borderStyle: 'dashed',
    },
    locationButtonText: {
        color: NanoTheme.colors.primary,
        fontWeight: '600',
        fontSize: 16,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: NanoTheme.colors.border,
    },
    dividerText: {
        color: NanoTheme.colors.textSecondary,
        marginHorizontal: 12,
        fontSize: 14,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        color: NanoTheme.colors.textSecondary,
        marginBottom: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        backgroundColor: NanoTheme.colors.background,
        padding: 16,
        borderRadius: 12,
        color: 'white',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    placesInput: {
        backgroundColor: NanoTheme.colors.background,
        padding: 12,
        borderRadius: 12,
        color: 'white',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    listView: {
        backgroundColor: NanoTheme.colors.backgroundAlt,
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    row: {
        flexDirection: 'row',
    },
    coordinatesInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        padding: 12,
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        borderRadius: 8,
    },
    coordinatesText: {
        color: NanoTheme.colors.primary,
        fontSize: 14,
    },
    primaryButton: {
        backgroundColor: NanoTheme.colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 18,
    },
});
