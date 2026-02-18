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
import { Phone, RefreshCw, CheckCircle } from 'lucide-react-native';
import { NanoTheme } from '../constants/nanobanana';
import { supabase } from '../lib/supabase';

const OTP_LENGTH = 6;

export default function PhoneVerificationScreen() {
    const router = useRouter();
    const { phoneNumber, userId } = useLocalSearchParams<{ phoneNumber: string; userId: string }>();

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [otpSent, setOtpSent] = useState(false);

    const inputRefs = useRef<(TextInput | null)[]>([]);

    // Send OTP on mount
    useEffect(() => {
        if (phoneNumber && !otpSent) {
            sendOTP();
        }
    }, [phoneNumber]);

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
        if (otpString.length === OTP_LENGTH && !loading && otpSent) {
            verifyOTP(otpString);
        }
    }, [otp, otpSent]);

    const sendOTP = async () => {
        if (!phoneNumber) {
            Alert.alert('Error', 'Phone number not found. Please try signing up again.');
            return;
        }

        setSending(true);
        try {
            // Use updateUser to add phone to existing user (sends OTP)
            // This keeps the session on the current user instead of creating a new phone-only user
            console.log('Sending phone verification OTP via updateUser...');
            const { error } = await supabase.auth.updateUser({
                phone: phoneNumber,
            });

            if (error) throw error;

            setOtpSent(true);
            setCountdown(60);
            Alert.alert('Code Sent', `A verification code has been sent to ${formatPhoneDisplay(phoneNumber)}`);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to send verification code.');
        } finally {
            setSending(false);
        }
    };

    const formatPhoneDisplay = (phone: string): string => {
        // Format: +27 82 123 4567
        if (phone.length === 12) {
            return `${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
        }
        return phone;
    };

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
        if (!phoneNumber) {
            Alert.alert('Error', 'Phone number not found. Please try signing up again.');
            return;
        }

        let targetUserId = userId;
        if (!targetUserId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) targetUserId = user.id;
        }

        if (!targetUserId) {
            Alert.alert('Error', 'User ID not found. Please try signing up again.');
            return;
        }

        console.log('=== PHONE VERIFICATION START ===');
        console.log('User ID:', targetUserId);
        console.log('Phone:', phoneNumber);
        console.log('OTP Code:', otpCode);

        setLoading(true);
        try {
            // Step 1: Verify phone OTP with phone_change type (for updateUser flow)
            console.log('Step 1: Calling supabase.auth.verifyOtp with phone_change...');
            const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
                phone: phoneNumber,
                token: otpCode,
                type: 'phone_change'
            });

            console.log('Verify OTP response data:', JSON.stringify(verifyData));

            if (verifyError) {
                console.log('Verify OTP ERROR:', verifyError.message);
                throw verifyError;
            }

            console.log('Step 1 SUCCESS: OTP verified, phone added to user');

            // Step 2: Update profiles table to mark phone as verified
            // Profile should exist for email user, so use update (not upsert)
            console.log('Step 2: Updating profiles table...');
            const { data: updateData, error: updateError } = await supabase
                .from('profiles')
                .update({
                    phone_verified: true,
                    phone_number: phoneNumber
                })
                .eq('id', targetUserId)
                .select();

            console.log('Profile update response:', JSON.stringify(updateData));

            if (updateError) {
                console.log('Profile update ERROR:', updateError.message);
                // Don't throw here - still show success if OTP was verified
            } else {
                console.log('Step 2 SUCCESS: Profile updated');
            }

            // Step 3: Refresh session
            console.log('Step 3: Refreshing session...');
            await supabase.auth.refreshSession();
            console.log('Step 3 SUCCESS: Session refreshed');

            console.log('=== PHONE VERIFICATION COMPLETE ===');

            Alert.alert('Success', 'Phone number verified successfully!', [
                {
                    text: 'Continue', onPress: () => {
                        console.log('Navigating to address confirmation...');
                        router.replace('/address-confirmation');
                    }
                }
            ]);
        } catch (err: any) {
            console.log('=== PHONE VERIFICATION FAILED ===');
            console.log('Error:', err.message || err);
            Alert.alert('Verification Failed', err.message || 'Invalid code. Please try again.');
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const resendOTP = async () => {
        if (countdown > 0 || !phoneNumber) return;

        setResending(true);
        try {
            // Use updateUser to resend phone OTP (keeps current session)
            const { error } = await supabase.auth.updateUser({
                phone: phoneNumber,
            });

            if (error) throw error;

            Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
            setCountdown(60);
            setOtp(Array(OTP_LENGTH).fill(''));
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to resend code.');
        } finally {
            setResending(false);
        }
    };

    if (sending) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <StatusBar barStyle="light-content" backgroundColor={NanoTheme.colors.background} />
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={NanoTheme.colors.primary} />
                <Text style={styles.sendingText}>Sending verification code...</Text>
            </View>
        );
    }

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
                    <Text style={styles.title}>Verify Phone</Text>
                    <Text style={styles.subtitle}>
                        We sent a 6-digit code to
                    </Text>
                    <Text style={styles.phone}>{formatPhoneDisplay(phoneNumber || '')}</Text>
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
                            testID={`otp-input-${index}`}
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
                    <Text style={styles.verifyButtonText}>Verify Phone</Text>
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
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendingText: {
        color: NanoTheme.colors.textSecondary,
        marginTop: 16,
        fontSize: 16,
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
    phone: {
        fontSize: 18,
        color: NanoTheme.colors.primary,
        fontWeight: '600',
        marginTop: 4,
        letterSpacing: 1,
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
