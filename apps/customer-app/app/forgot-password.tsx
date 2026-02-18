import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { NanoTheme } from '../constants/nanobanana';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleResetRequest() {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;

            // Navigate to OTP screen with recovery type
            router.push({
                pathname: '/otp-verification',
                params: { email, type: 'recovery' }
            });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send reset code.');
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
                    <ArrowLeft size={24} color={NanoTheme.colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Mail size={40} color={NanoTheme.colors.primary} />
                </View>

                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.subtitle}>
                    Enter your email address and we'll send you a code to reset your password.
                </Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="name@example.com"
                        placeholderTextColor={NanoTheme.colors.textSecondary}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        onChangeText={setEmail}
                        value={email}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.buttonDisabled]}
                    onPress={handleResetRequest}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <Text style={styles.buttonText}>Send Reset Code</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NanoTheme.colors.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
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
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: NanoTheme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 24,
    },
    label: {
        color: NanoTheme.colors.textSecondary,
        marginBottom: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        backgroundColor: NanoTheme.colors.backgroundAlt,
        padding: 16,
        borderRadius: 12,
        color: 'white',
        fontSize: 16,
        borderWidth: 1,
        borderColor: NanoTheme.colors.border,
    },
    primaryButton: {
        backgroundColor: NanoTheme.colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 18,
    },
});
