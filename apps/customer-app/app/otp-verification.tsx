import React, { useState, useRef, useEffect } from 'react';
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
import { Mail, RefreshCw, CheckCircle } from 'lucide-react-native';
import { NanoTheme } from '../constants/nanobanana';
import { supabase } from '../lib/supabase';

const OTP_LENGTH = 6;

export default function OTPVerificationScreen() {
    const router = useRouter();
    const { email, type } = useLocalSearchParams<{ email: string; type?: string }>();

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const inputRefs = useRef<(TextInput | null)[]>([]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Auto-verify when all digits entered
    useEffect(() => {
        const otpString = otp.join('');
        if (otpString.length === OTP_LENGTH && !loading) {
            verifyOTP(otpString);
        }
    }, [otp]);

    const handleOtpChange = (text: string, index: number) => {
        // Only allow digits
        const digit = text.replace(/[^0-9]/g, '').slice(-1);

        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);

        // Auto-focus next input
        if (digit && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const verifyOTP = async (otpCode: string) => {
        if (!email) {
            Alert.alert('Error', 'Email not found. Please try signing up again.');
            return;
        }

        setLoading(true);
        try {
            // Use Supabase's built-in OTP verification
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otpCode,
                type: type === 'recovery' ? 'recovery' : 'signup'
            });

            if (error) throw error;

            if (type === 'recovery') {
                router.replace('/reset-password');
            } else {
                Alert.alert('Success', 'Email verified successfully!', [
                    { text: 'Continue', onPress: () => router.replace('/address-confirmation') }
                ]);
            }
        } catch (err: any) {
            Alert.alert('Verification Failed', err.message || 'Invalid code. Please try again.');
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const resendOTP = async () => {
        if (countdown > 0 || !email) return;

        setResending(true);
        try {
            if (type === 'recovery') {
                // For recovery, we just request the password reset email again
                const { error } = await supabase.auth.resetPasswordForEmail(email);
                if (error) throw error;
            } else {
                // Use Supabase's resend method for signup
                const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email,
                });
                if (error) throw error;
            }

            Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
            setCountdown(60); // 60 second cooldown
            setOtp(Array(OTP_LENGTH).fill(''));
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to resend code.');
        } finally {
            setResending(false);
        }
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
                        <Mail size={40} color={NanoTheme.colors.primary} />
                    </View>
                    <Text style={styles.title}>Verify Email</Text>
                    <Text style={styles.subtitle}>
                        We sent a 6-digit code to
                    </Text>
                    <Text style={styles.email}>{email}</Text>
                </View>

                {/* OTP Input */}
                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputRefs.current[index] = ref; }}
                            style={[
                                styles.otpInput,
                                digit && styles.otpInputFilled
                            ]}
                            value={digit}
                            onChangeText={(text) => handleOtpChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            autoFocus={index === 0}
                        />
                    ))}
                </View>

                {/* Loading indicator */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={NanoTheme.colors.primary} />
                        <Text style={styles.loadingText}>Verifying...</Text>
                    </View>
                )}

                {/* Resend button */}
                <TouchableOpacity
                    style={[styles.resendButton, countdown > 0 && styles.resendButtonDisabled]}
                    onPress={resendOTP}
                    disabled={countdown > 0 || resending}
                >
                    {resending ? (
                        <ActivityIndicator size="small" color={NanoTheme.colors.primary} />
                    ) : (
                        <>
                            <RefreshCw size={18} color={countdown > 0 ? NanoTheme.colors.textSecondary : NanoTheme.colors.primary} />
                            <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Manual verify button */}
                <TouchableOpacity
                    style={[styles.verifyButton, otp.join('').length < OTP_LENGTH && styles.verifyButtonDisabled]}
                    onPress={() => verifyOTP(otp.join(''))}
                    disabled={otp.join('').length < OTP_LENGTH || loading}
                >
                    <CheckCircle size={20} color="black" />
                    <Text style={styles.verifyButtonText}>Verify Email</Text>
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
        alignItems: 'center',
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
    },
    email: {
        fontSize: 16,
        color: NanoTheme.colors.primary,
        fontWeight: '600',
        marginTop: 4,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 32,
    },
    otpInput: {
        width: 48,
        height: 56,
        borderRadius: 12,
        backgroundColor: NanoTheme.colors.backgroundAlt,
        borderWidth: 2,
        borderColor: NanoTheme.colors.border,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: NanoTheme.colors.text,
    },
    otpInputFilled: {
        borderColor: NanoTheme.colors.primary,
    },
    loadingContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    loadingText: {
        color: NanoTheme.colors.textSecondary,
        marginTop: 8,
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        marginBottom: 24,
    },
    resendButtonDisabled: {
        opacity: 0.5,
    },
    resendText: {
        color: NanoTheme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    resendTextDisabled: {
        color: NanoTheme.colors.textSecondary,
    },
    verifyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: NanoTheme.colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
    },
    verifyButtonDisabled: {
        opacity: 0.5,
    },
    verifyButtonText: {
        color: 'black',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
