import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform, StatusBar, ScrollView, Image, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { Stack, useRouter } from 'expo-router';
import { MapPin, Upload, CheckCircle, Camera, Car, FileText, X, Calendar, Eye, EyeOff } from 'lucide-react-native';
import { NanoTheme } from '../constants/nanobanana';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AuthScreen() {
    const [view, setView] = useState<'signin' | 'signup'>('signin');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Sign In State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Sign Up State
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [dob, setDob] = useState('');
    const [carReg, setCarReg] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [document, setDocument] = useState<any>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dobDate, setDobDate] = useState<Date | null>(null);

    async function pickImage() {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    }

    async function pickDocument() {
        try {
            // Mock document picker
            Alert.alert("Document Upload", "Select a document to upload (Mock)");
            setDocument({ name: "driver_license.pdf" });
        } catch (err) {
            console.log('Document picker error', err);
        }
    }

    async function handleSignIn() {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } catch (e: any) {
            Alert.alert('Sign In Failed', e.message);
        } finally {
            setLoading(false);
        }
    }

    async function checkConnection() {
        setLoading(true);
        try {
            console.log("Testing Google...");
            const google = await fetch('https://www.google.com', { method: 'HEAD' });
            console.log("Google:", google.status);

            console.log("Testing Supabase...");
            // Supabase URL from lib/supabase.ts
            const sbUrl = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
            const sb = await fetch(`${sbUrl}/auth/v1/health`, { method: 'GET' });
            console.log("Supabase:", sb.status);

            Alert.alert("Connection OK", `Google: ${google.status}\nSupabase: ${sb.status}`);
        } catch (e: any) {
            console.error(e);
            Alert.alert("Connection Failed", e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSignUp() {
        if (!agreedToTerms) {
            Alert.alert("Terms & Conditions", "You must agree to the Terms & Conditions to register.");
            return;
        }
        setLoading(true);
        try {
            // Age Verification
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (isNaN(age) || age < 18) {
                throw new Error("You must be 18+ years old to drive with us.");
            }

            const { error, data } = await supabase.auth.signUp({
                email: regEmail,
                password: regPassword,
                options: {
                    data: {
                        role: 'driver',
                        full_name: fullName,
                        dob: dob,
                        has_document: !!document,
                        vehicle_details: {
                            registration_number: carReg
                        },
                        // In a real app, upload profileImage to storage and save URL here
                        avatar_url: profileImage ? 'starts_with_file_needs_upload' : null
                    }
                }
            });

            if (error) throw error;

            if (data.session) {
                router.replace('/pending_approval');
            } else {
                Alert.alert('Success', 'Check your inbox for email verification!');
                setView('signin');
            }
        } catch (e: any) {
            Alert.alert('Registration Failed', e.message);
        } finally {
            setLoading(false);
        }
    }

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.iconCircle}>
                <MapPin size={40} color={NanoTheme.colors.primary} fill={NanoTheme.colors.primary} fillOpacity={0.2} />
            </View>
            <Text style={styles.title}>CannaDelivery</Text>
            <Text style={styles.subtitle}>Driver Partner App</Text>
        </View>
    );

    const renderSignIn = () => (
        <View style={styles.card}>
            <Text style={styles.formTitle}>Welcome Back</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    placeholder="driver@example.com"
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
            </View>

            <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSignIn}
                disabled={loading}
            >
                <Text style={styles.buttonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#555', marginTop: 10 }]}
                onPress={checkConnection}
            >
                <Text style={styles.buttonText}>Test Network</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkContainer} onPress={() => setView('signup')}>
                <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text></Text>
            </TouchableOpacity>
        </View>
    );

    const renderSignUp = () => (
        <View style={styles.card}>
            <Text style={styles.formTitle}>Become a Driver</Text>

            {/* Profile Picture */}
            <View style={styles.profilePicContainer}>
                <TouchableOpacity onPress={pickImage} style={styles.profilePicWrapper}>
                    {profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.profilePic} />
                    ) : (
                        <View style={styles.profilePlaceholder}>
                            <Camera size={32} color={NanoTheme.colors.primary} />
                        </View>
                    )}
                    <View style={styles.editBadge}>
                        <Upload size={12} color="black" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.profilePicLabel}>Tap to upload photo</Text>
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor={NanoTheme.colors.textSecondary}
                    onChangeText={setFullName}
                    value={fullName}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                    style={styles.input}
                    placeholder="driver@example.com"
                    placeholderTextColor={NanoTheme.colors.textSecondary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={setRegEmail}
                    value={regEmail}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordWrapper}>
                    <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="••••••••"
                        placeholderTextColor={NanoTheme.colors.textSecondary}
                        secureTextEntry={!showRegPassword}
                        onChangeText={setRegPassword}
                        value={regPassword}
                    />
                    <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowRegPassword(!showRegPassword)}
                    >
                        {showRegPassword ? (
                            <EyeOff size={20} color={NanoTheme.colors.textSecondary} />
                        ) : (
                            <Eye size={20} color={NanoTheme.colors.textSecondary} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Calendar size={20} color={NanoTheme.colors.textSecondary} />
                    <Text style={dobDate ? styles.dateText : styles.datePlaceholder}>
                        {dobDate ? dobDate.toLocaleDateString('en-ZA') : 'Select your birth date'}
                    </Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        value={dobDate || new Date(2000, 0, 1)}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        maximumDate={new Date()}
                        minimumDate={new Date(1920, 0, 1)}
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(Platform.OS === 'ios');
                            if (selectedDate) {
                                setDobDate(selectedDate);
                                setDob(selectedDate.toISOString().split('T')[0]);
                            }
                        }}
                        themeVariant="dark"
                    />
                )}
                {Platform.OS === 'ios' && showDatePicker && (
                    <TouchableOpacity
                        style={styles.dateConfirmButton}
                        onPress={() => setShowDatePicker(false)}
                    >
                        <Text style={styles.dateConfirmText}>Done</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Vehicle Registration Number</Text>
                <View style={styles.iconInputWrapper}>
                    <Car size={20} color={NanoTheme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, styles.iconInput]}
                        placeholder="ABC 123 GP"
                        placeholderTextColor={NanoTheme.colors.textSecondary}
                        autoCapitalize="characters"
                        onChangeText={setCarReg}
                        value={carReg}
                    />
                </View>
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Driver License / ID</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
                    {document ? (
                        <View style={styles.uploadedContainer}>
                            <CheckCircle size={20} color={NanoTheme.colors.primary} />
                            <Text style={[styles.uploadedText, { color: NanoTheme.colors.primary }]}>{document.name}</Text>
                        </View>
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <Upload size={20} color={NanoTheme.colors.textSecondary} />
                            <Text style={styles.uploadText}>Upload Document (18+)</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Terms and Conditions */}
            <View style={styles.termsContainer}>
                <TouchableOpacity
                    style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
                    onPress={() => setAgreedToTerms(!agreedToTerms)}
                >
                    {agreedToTerms && <CheckCircle size={16} color="black" />}
                </TouchableOpacity>
                <View style={styles.termsTextContainer}>
                    <Text style={styles.termsText}>I agree to the </Text>
                    <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                        <Text style={styles.termsLink}>Terms & Conditions</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.primaryButton, !agreedToTerms && styles.disabledButton]}
                onPress={handleSignUp}
                disabled={loading || !agreedToTerms}
            >
                <Text style={styles.buttonText}>{loading ? 'Creating Profile...' : 'Submit Application'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkContainer} onPress={() => setView('signin')}>
                <Text style={styles.linkText}>Already have an account? <Text style={styles.linkHighlight}>Sign In</Text></Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" backgroundColor={NanoTheme.colors.background} />
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {renderHeader()}
                    {view === 'signin' ? renderSignIn() : renderSignUp()}
                </View>
            </ScrollView>

            {/* Terms Modal */}
            <Modal
                visible={showTermsModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Terms & Conditions</Text>
                        <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                            <X size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.legalText}>
                            Last Updated: 2026-01-22{"\n\n"}
                            1. Acceptance of Terms{"\n"}
                            By accessing or using the CannaDelivery Driver App, you agree to be bound by these Terms.{"\n\n"}
                            2. Driver Requirements{"\n"}
                            You must be at least 18 years of age and hold a valid driver's license.{"\n\n"}
                            3. Code of Conduct{"\n"}
                            Drivers must maintain professional conduct and adhere to local traffic laws at all times.{"\n\n"}
                            4. Termination{"\n"}
                            We reserve the right to terminate your account for violations of these terms.{"\n\n"}
                            [... More Lorem Ipsum Legal Text ...]
                        </Text>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                                setAgreedToTerms(true);
                                setShowTermsModal(false);
                            }}
                        >
                            <Text style={styles.modalButtonText}>I Agree</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
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
    disabledButton: {
        backgroundColor: '#333',
        shadowOpacity: 0,
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
    // Date Picker Styles
    datePickerButton: {
        backgroundColor: NanoTheme.colors.background,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dateText: {
        color: 'white',
        fontSize: 16,
    },
    datePlaceholder: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 16,
    },
    dateConfirmButton: {
        backgroundColor: NanoTheme.colors.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    dateConfirmText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Profile Pic Styles
    profilePicContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    profilePicWrapper: {
        position: 'relative',
    },
    profilePic: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: NanoTheme.colors.primary,
    },
    profilePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: NanoTheme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: NanoTheme.colors.textSecondary,
        borderStyle: 'dashed',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: NanoTheme.colors.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: NanoTheme.colors.background,
    },
    profilePicLabel: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 12,
        marginTop: 8,
    },
    // Upload Button
    uploadButton: {
        backgroundColor: NanoTheme.colors.background,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
    },
    uploadPlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    uploadedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    uploadText: {
        color: NanoTheme.colors.textSecondary,
        fontWeight: '500',
    },
    uploadedText: {
        fontWeight: '500',
    },
    // Checkbox & Terms
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: NanoTheme.colors.primary,
        backgroundColor: NanoTheme.colors.background,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: NanoTheme.colors.primary,
    },
    termsTextContainer: {
        flexDirection: 'row',
    },
    termsText: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 14,
    },
    termsLink: {
        color: NanoTheme.colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: '#111',
    },
    modalHeader: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalContent: {
        padding: 24,
    },
    legalText: {
        color: '#ccc',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 32,
    },
    modalButton: {
        backgroundColor: NanoTheme.colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 40,
    },
    modalButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 18,
    }
});
