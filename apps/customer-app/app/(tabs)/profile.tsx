import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { User, Mail, Phone, MapPin, LogOut, Edit2 } from 'lucide-react-native';

interface UserProfile {
    first_name: string | null;
    surname: string | null;
    preferred_name: string | null;
    full_name: string | null;
    email: string;
    phone_number: string | null;
    address: string | null;
    address_confirmed: boolean;
    created_at: string;
}

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    async function fetchProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user on the session!');

            const { data, error, status } = await supabase
                .from('profiles')
                .select('first_name, surname, preferred_name, full_name, phone_number, address_confirmed, created_at')
                .eq('id', user.id)
                .single();

            if (error && status !== 406) {
                throw error;
            }

            if (data) {
                // Fetch address
                const { data: addressData } = await supabase
                    .from('user_addresses')
                    .select('address_line1, city')
                    .eq('user_id', user.id)
                    .eq('is_default', true)
                    .single();

                let displayAddress = null;
                if (addressData) {
                    displayAddress = `${addressData.address_line1}, ${addressData.city}`;
                }

                setProfile({
                    first_name: data.first_name,
                    surname: data.surname,
                    preferred_name: data.preferred_name,
                    full_name: data.full_name,
                    email: user.email || '', // Retain email from original
                    phone_number: data.phone_number,
                    address: displayAddress,
                    address_confirmed: data.address_confirmed || false,
                    created_at: new Date(data.created_at).toLocaleDateString(),
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatarCircle}>
                    <User size={40} color="#10b981" />
                </View>
                <Text style={styles.name}>{profile?.full_name || 'Customer'}</Text>
                <Text style={styles.memberSince}>
                    Member since {new Date(profile?.created_at || Date.now()).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Account Details</Text>

                {/* First Name */}
                <View style={styles.infoRow}>
                    <View style={styles.iconContainer}>
                        <User size={20} color="#94a3b8" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>First Name</Text>
                        <Text style={styles.infoValue}>{profile?.first_name || 'Not set'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Surname */}
                <View style={styles.infoRow}>
                    <View style={styles.iconContainer}>
                        <User size={20} color="#94a3b8" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Surname</Text>
                        <Text style={styles.infoValue}>{profile?.surname || 'Not set'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Preferred Name */}
                <View style={styles.infoRow}>
                    <View style={styles.iconContainer}>
                        <User size={20} color="#94a3b8" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Preferred Name</Text>
                        <Text style={styles.infoValue}>{profile?.preferred_name || profile?.first_name || 'Not set'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Email */}
                <View style={styles.infoRow}>
                    <View style={styles.iconContainer}>
                        <Mail size={20} color="#94a3b8" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{profile?.email}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Cell Phone */}
                <View style={styles.infoRow}>
                    <View style={styles.iconContainer}>
                        <Phone size={20} color="#94a3b8" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Cell Phone</Text>
                        <Text style={styles.infoValue}>{profile?.phone_number || 'Not verified'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Delivery Address */}
                <View style={styles.infoRow}>
                    <View style={styles.iconContainer}>
                        <MapPin size={20} color="#94a3b8" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Delivery Address</Text>
                        {profile?.address_confirmed && profile?.address ? (
                            <Text style={styles.infoValue}>{profile.address}</Text>
                        ) : (
                            <Text style={styles.infoValueMuted}>Not confirmed</Text>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => router.push({ pathname: '/address-confirmation', params: { editing: 'true' } })}
                    >
                        <Edit2 size={16} color="#10b981" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
                onPress={() => supabase.auth.signOut()}
                style={styles.signOutButton}
            >
                <LogOut size={20} color="#ef4444" />
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    content: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#10b98120',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#10b981',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    memberSince: {
        fontSize: 14,
        color: '#64748b',
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        color: 'white',
    },
    infoValueHighlight: {
        fontSize: 16,
        color: '#10b981',
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    infoValueMuted: {
        fontSize: 16,
        color: '#64748b',
        fontStyle: 'italic',
    },
    editButton: {
        padding: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#334155',
        marginVertical: 16,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        backgroundColor: '#ef444420',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    signOutText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
