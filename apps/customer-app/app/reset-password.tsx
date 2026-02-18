import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { NanoTheme } from '../constants/nanobanana';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleUpdatePassword() {
        if (!password || !confirmPassword) {
            Alert.alert('Error', 'Please enter your new password.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            Alert.alert('Success', 'Your password has been updated successfully!', [
                { text: 'OK', onPress: () => router.replace('/(tabs)') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update password.');
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

            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.iconCircle}>
                        <Lock size={40} color={NanoTheme.colors.primary} />
                    </View>
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>
                        Enter your new password below.
                    </Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.passwordWrapper}>
                        <TextInput
                            style={[styles.input, styles.passwordInput]}
                            placeholder="Min 6 characters"
                            placeholderTextColor={NanoTheme.colors.textSecondary}
                            secureTextEntry={!showPassword}
                            onChangeText={setPassword}
                            value={password}
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <EyeOff size={20} color={NanoTheme.colors.textSecondary} />
                            ) : (
                                <Eye size={20} color={NanoTheme.colors.textSecondary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Re-enter password"
                        placeholderTextColor={NanoTheme.colors.textSecondary}
                        secureTextEntry={!showPassword}
                        onChangeText={setConfirmPassword}
                        value={confirmPassword}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.buttonDisabled]}
                    onPress={handleUpdatePassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <Text style={styles.buttonText}>Update Password</Text>
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
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 80,
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
    },
    inputContainer: {
        marginBottom: 20,
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
    passwordWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
    primaryButton: {
        backgroundColor: NanoTheme.colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
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
