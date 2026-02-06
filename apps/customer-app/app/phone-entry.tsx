import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    TextInput,
    TouchableOpacity,
    Text,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { NanoTheme } from '../constants/nanobanana';

export default function PhoneEntryScreen() {
    const router = useRouter();
    const { userId } = useLocalSearchParams<{ userId: string }>();

    const [phoneNumber, setPhoneNumber] = useState('+27');
    const [loading, setLoading] = useState(false);

    // Validate South African phone number
    const validateSAPhoneNumber = (phone: string): boolean => {
        // SA phone format: +27 followed by 9 digits (e.g., +27821234567)
        const saPhoneRegex = /^\+27[0-9]{9}$/;
        return saPhoneRegex.test(phone.replace(/\s/g, ''));
    };

    // Format phone number as user types
    const handlePhoneChange = (text: string) => {
        // Keep only digits and the leading +
        let cleaned = text.replace(/[^0-9+]/g, '');
        // Ensure it starts with +27
        if (!cleaned.startsWith('+27')) {
            cleaned = '+27';
        }
        // Limit to +27 plus 9 digits
        if (cleaned.length > 12) {
            cleaned = cleaned.slice(0, 12);
        }
        setPhoneNumber(cleaned);
    };

    // Format phone number for display
    const formatPhoneDisplay = (phone: string): string => {
        // Format: +27 82 123 4567
        if (phone.length >= 6) {
            let formatted = phone.slice(0, 3);
            if (phone.length > 3) formatted += ' ' + phone.slice(3, 5);
            if (phone.length > 5) formatted += ' ' + phone.slice(5, 8);
            if (phone.length > 8) formatted += ' ' + phone.slice(8);
            return formatted;
        }
        return phone;
    };

    const handleContinue = () => {
        if (!validateSAPhoneNumber(phoneNumber)) {
            Alert.alert('Invalid Number', 'Please enter a valid South African phone number (e.g., +27821234567).');
            return;
        }

        // Navigate to phone verification with the phone number
        router.push({
            pathname: '/phone-verification',
            params: {
                phoneNumber: phoneNumber.replace(/\s/g, ''),
                userId
            }
        });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" backgroundColor={NanoTheme.colors.background} />
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconCircle}>
                        <Phone size={40} color={NanoTheme.colors.primary} />
                    </View>
                    <Text style={styles.title}>Add Your Phone</Text>
                    <Text style={styles.subtitle}>
                        We'll send a verification code to confirm your number
                    </Text>
                </View>

                {/* Phone Input */}
                <View style={styles.card}>
                    <Text style={styles.label}>South African Phone Number</Text>
                    <View style={styles.inputContainer}>
                        <View style={styles.flagContainer}>
                            <Text style={styles.flag}>🇿🇦</Text>
                        </View>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="+27 82 123 4567"
                            placeholderTextColor={NanoTheme.colors.textSecondary}
                            onChangeText={handlePhoneChange}
                            value={formatPhoneDisplay(phoneNumber)}
                            keyboardType="phone-pad"
                            autoFocus
                        />
                    </View>

                    <Text style={styles.hint}>
                        Enter your 10-digit mobile number starting with 0, we'll add +27 for you
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.continueButton,
                            !validateSAPhoneNumber(phoneNumber) && styles.continueButtonDisabled
                        ]}
                        onPress={handleContinue}
                        disabled={!validateSAPhoneNumber(phoneNumber) || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="black" />
                        ) : (
                            <Text style={styles.continueButtonText}>Continue</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NanoTheme.colors.background,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 80,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: NanoTheme.colors.primaryDim,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 0, 0.2)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: NanoTheme.colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: NanoTheme.colors.textSecondary,
        textAlign: 'center',
    },
    card: {
        backgroundColor: NanoTheme.colors.backgroundAlt,
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: NanoTheme.colors.border,
    },
    label: {
        color: NanoTheme.colors.textSecondary,
        marginBottom: 12,
        fontSize: 14,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: NanoTheme.colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        overflow: 'hidden',
    },
    flagContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRightWidth: 1,
        borderRightColor: '#333',
    },
    flag: {
        fontSize: 24,
    },
    phoneInput: {
        flex: 1,
        padding: 16,
        color: NanoTheme.colors.text,
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 1,
    },
    hint: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 12,
        marginTop: 12,
        textAlign: 'center',
    },
    continueButton: {
        backgroundColor: NanoTheme.colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
    },
    continueButtonDisabled: {
        opacity: 0.5,
    },
    continueButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 18,
    },
});
