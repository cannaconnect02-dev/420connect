import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NanoTheme } from '../constants/nanobanana';
import { Clock, CheckCircle, ShieldAlert } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

export default function PendingApprovalScreen() {
    const router = useRouter();
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);

    useEffect(() => {
        checkStatus();
    }, []);

    async function checkStatus() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase
            .from('profiles')
            .select('status, rejection_reason')
            .eq('id', session.user.id)
            .single();

        if (data?.status === 'active') {
            router.replace('/(tabs)');
        } else if (data?.status === 'rejected') {
            setRejectionReason(data.rejection_reason || 'Application did not meet requirements.');
        } else {
            // Still pending
        }
    }

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.replace('/auth');
    }

    if (rejectionReason) {
        return (
            <View style={styles.container}>
                <View style={[styles.iconContainer, { borderColor: NanoTheme.colors.error }]}>
                    <ShieldAlert size={48} color={NanoTheme.colors.error} />
                </View>

                <Text style={styles.title}>Application Declined</Text>
                <Text style={styles.message}>
                    Unfortunately, your application to drive with CannaDelivery was not approved.
                </Text>

                <View style={styles.reasonContainer}>
                    <Text style={styles.reasonLabel}>Reason:</Text>
                    <Text style={styles.reasonText}>{rejectionReason}</Text>
                </View>

                <TouchableOpacity style={styles.outlineButton} onPress={handleSignOut}>
                    <Text style={styles.outlineText}>Sign Out & Contact Support</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Clock size={48} color={NanoTheme.colors.primary} />
            </View>

            <Text style={styles.title}>Application Received</Text>
            <Text style={styles.message}>
                Thanks for signing up to drive with CannaDelivery!
                {"\n\n"}
                Your profile is currently under review by our administration team. This typically takes 24-48 hours.
            </Text>

            <TouchableOpacity style={styles.button} onPress={checkStatus}>
                <Text style={styles.buttonText}>Check Status</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineButton} onPress={handleSignOut}>
                <Text style={styles.outlineText}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NanoTheme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: NanoTheme.colors.backgroundAlt,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: NanoTheme.colors.primary,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: NanoTheme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    reasonContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)', // Red tint
        padding: 16,
        borderRadius: 12,
        width: '100%',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    reasonLabel: {
        color: '#f87171', // Red 400
        fontWeight: 'bold',
        marginBottom: 4,
    },
    reasonText: {
        color: 'white',
        fontSize: 16,
    },
    button: {
        backgroundColor: NanoTheme.colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonText: {
        color: 'black',
        fontSize: 18,
        fontWeight: 'bold',
    },
    outlineButton: {
        paddingVertical: 16,
        width: '100%',
        alignItems: 'center',
    },
    outlineText: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 16,
    }
});
