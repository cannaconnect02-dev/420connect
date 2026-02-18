import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Modal, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Stack, useRouter } from 'expo-router';
import { ShoppingBag, Eye, EyeOff, Calendar, User } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NanoTheme } from '../constants/nanobanana';

export default function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Sign Up Fields
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [preferredName, setPreferredName] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Calculate age from date
    const calculateAge = (birthDate: Date): number => {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Format date for display
    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Format date for database storage
    const formatDateForDB = (date: Date): string => {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDob(selectedDate);
        }
    };

    async function handleAuth() {
        setLoading(true);
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                // Validation
                if (!firstName.trim() || !surname.trim()) {
                    throw new Error('Please enter your first name and surname.');
                }

                if (!dob) {
                    throw new Error('Please select your date of birth.');
                }

                // Age Verification
                const age = calculateAge(dob);
                if (age < 18) {
                    throw new Error('You must be 18+ years old to join.');
                }

                // Sign up with Supabase - this sends OTP email automatically
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            role: 'customer',
                            first_name: firstName,
                            surname: surname,
                            preferred_name: preferredName.trim() || firstName,
                            dob: formatDateForDB(dob),
                        }
                    }
                });

                if (signUpError) throw signUpError;

                const userId = signUpData.user?.id;
                if (!userId) throw new Error('Registration failed. Please try again.');

                // Navigate to OTP verification - Supabase already sent the email
                router.push({
                    pathname: '/otp-verification',
                    params: { email, userId }
                });
            }
        } catch (e: any) {
            if (e.message.includes('Email not confirmed')) {
                // Handle unverified email
                Alert.alert(
                    'Email Not Verified',
                    'Your email address has not been verified yet. We have sent you a new verification code.',
                    [
                        {
                            text: 'OK',
                            onPress: async () => {
                                try {
                                    await supabase.auth.resend({
                                        type: 'signup',
                                        email,
                                    });
                                    router.push({
                                        pathname: '/otp-verification',
                                        params: { email }
                                    });
                                } catch (resendError) {
                                    console.log('Error resending code:', resendError);
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', e.message);
            }
        } finally {
            setLoading(false);
        }
    }

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.iconCircle}>
                <ShoppingBag size={40} color={NanoTheme.colors.primary} fill={NanoTheme.colors.primary} fillOpacity={0.2} />
            </View>
            <Text style={styles.title}>420Connect</Text>
            <Text style={styles.subtitle}>{isLogin ? 'Customer Portal' : 'Join the Community'}</Text>
        </View>
    );

    // Calculate max date (18 years ago from today)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" backgroundColor={NanoTheme.colors.background} />
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.content}>
                    {renderHeader()}

                    <View style={styles.card}>
                        <Text style={styles.formTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>

                        {!isLogin && (
                            <>
                                {/* First Name */}
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>First Name</Text>
                                    <View style={styles.iconInputWrapper}>
                                        <User size={20} color={NanoTheme.colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, styles.iconInput]}
                                            placeholder="John"
                                            placeholderTextColor={NanoTheme.colors.textSecondary}
                                            onChangeText={setFirstName}
                                            value={firstName}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>

                                {/* Surname */}
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Surname</Text>
                                    <View style={styles.iconInputWrapper}>
                                        <User size={20} color={NanoTheme.colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, styles.iconInput]}
                                            placeholder="Doe"
                                            placeholderTextColor={NanoTheme.colors.textSecondary}
                                            onChangeText={setSurname}
                                            value={surname}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>

                                {/* Preferred Name */}
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Preferred Name (optional)</Text>
                                    <View style={styles.iconInputWrapper}>
                                        <User size={20} color={NanoTheme.colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, styles.iconInput]}
                                            placeholder="How we should call you"
                                            placeholderTextColor={NanoTheme.colors.textSecondary}
                                            onChangeText={setPreferredName}
                                            value={preferredName}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>

                                {/* Date of Birth */}
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Date of Birth (18+)</Text>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Calendar size={20} color={NanoTheme.colors.textSecondary} />
                                        <Text style={[styles.dateText, !dob && styles.datePlaceholder]}>
                                            {dob ? formatDate(dob) : 'Select your birth date'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Date Picker Modal for iOS */}
                                {Platform.OS === 'ios' && showDatePicker && (
                                    <Modal
                                        transparent
                                        animationType="slide"
                                        visible={showDatePicker}
                                    >
                                        <View style={styles.modalOverlay}>
                                            <View style={styles.modalContent}>
                                                <View style={styles.modalHeader}>
                                                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                                        <Text style={styles.modalCancel}>Cancel</Text>
                                                    </TouchableOpacity>
                                                    <Text style={styles.modalTitle}>Date of Birth</Text>
                                                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                                        <Text style={styles.modalDone}>Done</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <DateTimePicker
                                                    value={dob || maxDate}
                                                    mode="date"
                                                    display="spinner"
                                                    onChange={handleDateChange}
                                                    maximumDate={maxDate}
                                                    minimumDate={new Date(1920, 0, 1)}
                                                    textColor={NanoTheme.colors.text}
                                                />
                                            </View>
                                        </View>
                                    </Modal>
                                )}

                                {/* Date Picker for Android */}
                                {Platform.OS === 'android' && showDatePicker && (
                                    <DateTimePicker
                                        value={dob || maxDate}
                                        mode="date"
                                        display="default"
                                        onChange={handleDateChange}
                                        maximumDate={maxDate}
                                        minimumDate={new Date(1920, 0, 1)}
                                    />
                                )}
                            </>
                        )}

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

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    placeholder="••••••••"
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
                            <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/forgot-password')}>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryButton, loading && styles.primaryButtonLoading]}
                            onPress={handleAuth}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    {isLogin ? 'Sign In' : 'Sign Up'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.linkContainer} onPress={() => setIsLogin(!isLogin)}>
                            <Text style={styles.linkText}>
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <Text style={styles.linkHighlight}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
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
        fontSize: 32,
        fontWeight: 'bold',
        color: NanoTheme.colors.text,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: NanoTheme.colors.textSecondary,
        marginTop: 4,
    },
    card: {
        backgroundColor: NanoTheme.colors.backgroundAlt,
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: NanoTheme.colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        marginBottom: 40,
    },
    formTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
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
    iconInputWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    iconInput: {
        paddingLeft: 48,
    },
    inputIcon: {
        position: 'absolute',
        left: 16,
        zIndex: 10,
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
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: NanoTheme.colors.background,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    dateText: {
        color: NanoTheme.colors.text,
        fontSize: 16,
    },
    datePlaceholder: {
        color: NanoTheme.colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: NanoTheme.colors.backgroundAlt,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: NanoTheme.colors.border,
    },
    modalTitle: {
        color: NanoTheme.colors.text,
        fontSize: 18,
        fontWeight: '600',
    },
    modalCancel: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 16,
    },
    modalDone: {
        color: NanoTheme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: NanoTheme.colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: NanoTheme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    primaryButtonLoading: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 18,
    },
    linkContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    linkText: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 14,
    },
    linkHighlight: {
        color: NanoTheme.colors.primary,
        fontWeight: 'bold',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: 12,
    },
    forgotPasswordText: {
        color: NanoTheme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});
