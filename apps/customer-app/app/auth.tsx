import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { supabase } from '../lib/supabase';
import { Stack, useRouter } from 'expo-router';
import { ShoppingBag, Upload, CheckCircle, Eye, EyeOff, Calendar } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
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
    const [fullName, setFullName] = useState('');
    const [dob, setDob] = useState('');
    const [document, setDocument] = useState<any>(null);

    async function pickDocument() {
        try {
            Alert.alert("Document Upload", "Select a document to upload (Mock)");
            setDocument({ name: "id_document.pdf" });
        } catch (err) {
            console.log('Document picker error', err);
        }
    }

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
                // Age Verification
                const birthDate = new Date(dob);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                if (isNaN(age) || age < 18) {
                    throw new Error("You must be 18+ years old to join.");
                }

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            role: 'customer',
                            full_name: fullName,
                            dob: dob,
                            has_document: !!document
                        }
                    }
                });

                if (error) throw error;
                Alert.alert('Success', 'Check your inbox for email verification!');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
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
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Full Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Jane Doe"
                                        placeholderTextColor={NanoTheme.colors.textSecondary}
                                        onChangeText={setFullName}
                                        value={fullName}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
                                    <View style={styles.iconInputWrapper}>
                                        <Calendar size={20} color={NanoTheme.colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, styles.iconInput]}
                                            placeholder="1995-04-20"
                                            placeholderTextColor={NanoTheme.colors.textSecondary}
                                            onChangeText={setDob}
                                            value={dob}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>ID Document (18+)</Text>
                                    <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
                                        {document ? (
                                            <View style={styles.uploadedContainer}>
                                                <CheckCircle size={20} color={NanoTheme.colors.primary} />
                                                <Text style={[styles.uploadedText, { color: NanoTheme.colors.primary }]}>{document.name}</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.uploadPlaceholder}>
                                                <Upload size={20} color={NanoTheme.colors.textSecondary} />
                                                <Text style={styles.uploadText}>Upload ID</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
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
                        </View>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleAuth}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                            </Text>
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
});
