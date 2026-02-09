import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Alert, KeyboardAvoidingView, Platform, FlatList, StatusBar,
    ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Stack, useRouter } from 'expo-router';
import { MapPin, Navigation, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { NanoTheme } from '../constants/nanobanana';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function DeliveryAddressEditScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [address, setAddress] = useState('');
    const [suburb, setSuburb] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

    const placesRef = useRef<any>(null);

    useEffect(() => {
        loadCurrentAddress();
    }, []);

    async function loadCurrentAddress() {
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
        } catch (e) {
            console.log("Error loading address", e);
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
                const newAddress = `${result.streetNumber || ''} ${result.street || ''}`.trim() || result.name || '';
                setAddress(newAddress);
                if (placesRef.current) {
                    placesRef.current.setAddressText(newAddress);
                }
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

    const handlePlaceSelected = (data: any, details: any = null) => {
        if (details) {
            const { geometry, address_components, formatted_address } = details;

            if (geometry && geometry.location) {
                setCoordinates({
                    lat: geometry.location.lat,
                    lng: geometry.location.lng
                });
            }

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

            const newAddress = `${streetNumber} ${route}`.trim() || formatted_address.split(',')[0];
            setAddress(newAddress);
            setSuburb(sub);
            setCity(cty);
            setPostalCode(pcode);
        }
    };

    async function saveAddress() {
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

            Alert.alert("Success", "Delivery address updated!");
            router.back();

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

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Delivery Address</Text>
                <View style={{ width: 44 }} />
            </View>

            <FlatList
                data={[]}
                renderItem={null}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="always"
                ListHeaderComponent={
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

                        <View style={[styles.inputContainer, { zIndex: 1000 }]}>
                            <Text style={styles.label}>Search Address</Text>
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
                                    styles={{
                                        textInput: styles.placesInput,
                                        listView: {
                                            ...styles.listView,
                                            position: 'absolute',
                                            top: 50,
                                            left: 0,
                                            right: 0,
                                            zIndex: 9999,
                                            elevation: 5,
                                        },
                                        description: { color: 'white' },
                                        row: { backgroundColor: NanoTheme.colors.backgroundAlt },
                                        separator: { backgroundColor: '#333' },
                                        container: { flex: 0 },
                                    }}
                                    textInputProps={{
                                        placeholderTextColor: NanoTheme.colors.textSecondary,
                                        value: address,
                                        onChangeText: (text) => setAddress(text),
                                    }}
                                    listProps={{
                                        nestedScrollEnabled: true,
                                    }}
                                    enablePoweredByContainer={false}
                                />
                            </View>
                        </View>

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
                            onPress={saveAddress}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Saving...' : 'Update Address'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NanoTheme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
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
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
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
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
