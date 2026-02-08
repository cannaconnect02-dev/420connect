
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { NanoTheme } from '../constants/nanobanana';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

interface GooglePlacesInputProps {
    onPlaceSelected: (details: any) => void;
    placeholder?: string;
}

const GooglePlacesInput = ({ onPlaceSelected, placeholder = 'Search' }: GooglePlacesInputProps) => {
    return (
        <View style={styles.container}>
            <GooglePlacesAutocomplete
                placeholder={placeholder}
                onPress={(data, details = null) => {
                    // 'details' is provided when fetchDetails = true
                    if (details) {
                        onPlaceSelected(details);
                    }
                }}
                query={{
                    key: GOOGLE_PLACES_API_KEY,
                    language: 'en',
                    components: 'country:za', // Restrict to South Africa
                }}
                fetchDetails={true}
                styles={{
                    textInput: styles.input,
                    listView: styles.listView,
                    row: styles.row,
                    description: styles.description,
                    poweredContainer: { display: 'none' },
                }}
                textInputProps={{
                    placeholderTextColor: NanoTheme.colors.textSecondary,
                }}
                enablePoweredByContainer={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        zIndex: 1, // Ensure dropdown appears above other content
    },
    input: {
        backgroundColor: NanoTheme.colors.background,
        color: 'white',
        fontSize: 16,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#333',
        height: 50,
    },
    listView: {
        backgroundColor: NanoTheme.colors.backgroundAlt,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#333',
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    row: {
        backgroundColor: 'transparent',
        padding: 13,
        height: 44,
        flexDirection: 'row',
    },
    description: {
        color: 'white',
        fontSize: 14,
    },
});

export default GooglePlacesInput;
