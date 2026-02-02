import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
    ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Stack, useRouter } from 'expo-router';
import { MapPin, Navigation, CheckCircle } from 'lucide-react-native';
import { NanoTheme } from '../constants/nanobanana';
import * as Location from 'expo-location';

export default function AddressConfirmationScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [address, setAddress] = useState('');
    const [suburb, setSuburb] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

    // Check if user already has confirmed address
    useEffect(() => {
        checkExistingAddress();
    }, []);

    async function checkExistingAddress() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('address_confirmed, address, delivery_lat, delivery_lng')
            .eq('id', user.id)
            .single();

        if (profile?.address_confirmed && profile?.delivery_lat && profile?.delivery_lng) {
            router.replace('/(tabs)');
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

            // Reverse geocode to get address
            const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (result) {
                setAddress(result.street || result.name || '');
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

    async function geocodeAddress(): Promise<{ lat: number; lng: number } | null> {
        const fullAddress = `${address}, ${suburb}, ${city}, ${postalCode}`;
        try {
            const results = await Location.geocodeAsync(fullAddress);
            if (results.length > 0) {
                return { lat: results[0].latitude, lng: results[0].longitude };
            }
        } catch (error) {
            console.log('Geocoding error:', error);
        }
        return null;
    }

    async function confirmAddress() {
        if (!address.trim() || !city.trim()) {
            Alert.alert('Error', 'Please enter at least your street address and city.');
            return;
        }

        setLoading(true);
        try {
            let coords = coordinates;

            // If no coordinates yet, try to geocode
            if (!coords) {
                coords = await geocodeAddress();
                if (!coords) {
                    Alert.alert('Error', 'Could not verify your address location. Please try using "Use Current Location" or enter a more specific address.');
                    setLoading(false);
                    return;
                }
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const fullAddress = `${address}, ${suburb}, ${city}${postalCode ? `, ${postalCode}` : ''}`;

            const { error } = await supabase
                .from('profiles')
                .update({
                    address: fullAddress,
                    delivery_lat: coords.lat,
                    delivery_lng: coords.lng,
                    address_confirmed: true
                })
                .eq('id', user.id);

            if (error) throw error;

            Alert.alert('Success', 'Your delivery address has been confirmed!');
            // Auto-redirect to menu after brief delay
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 1500);
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
                            <Text style={styles.dividerText}>or enter manually</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Street Address *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="123 Main Street"
                                placeholderTextColor={NanoTheme.colors.textSecondary}
                                value={address}
                                onChangeText={setAddress}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Suburb / Area</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Claremont"
                                placeholderTextColor={NanoTheme.colors.textSecondary}
                                value={suburb}
                                onChangeText={setSuburb}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 2 }]}>
                                <Text style={styles.label}>City *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Cape Town"
                                    placeholderTextColor={NanoTheme.colors.textSecondary}
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1, marginLeft: 12 }]}>
                                <Text style={styles.label}>Postal Code</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="7708"
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
                                    Location verified
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
