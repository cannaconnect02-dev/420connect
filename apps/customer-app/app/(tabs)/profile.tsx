import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { User, Mail, CreditCard, MapPin, LogOut, Edit2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface UserProfile {
    full_name: string | null;
    email: string;
    address: string | null;
    address_confirmed: boolean;
    created_at: string;
}

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [membershipNumber, setMembershipNumber] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('profiles')
                .select('full_name, address, address_confirmed, created_at')
                .eq('id', user.id)
                .single();

            setProfile({
                full_name: data?.full_name || null,
                email: user.email || '',
                address: data?.address || null,
                address_confirmed: data?.address_confirmed || false,
                created_at: data?.created_at || user.created_at
            });

            // Generate membership number from user ID (first 8 chars uppercase)
            setMembershipNumber(`420C-${user.id.substring(0, 8).toUpperCase()}`);
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

            {/* Profile Info Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Account Details</Text>

                <View style={styles.infoRow}>
                    <View style={styles.iconContainer}>
                        <User size={20} color="#94a3b8" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Full Name</Text>
                        <Text style={styles.infoValue}>{profile?.full_name || 'Not set'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

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

                <View style={styles.infoRow}>
                    <View style={styles.iconContainer}>
                        <CreditCard size={20} color="#94a3b8" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Membership Number</Text>
                        <Text style={styles.infoValueHighlight}>{membershipNumber}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

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
                        onPress={() => router.push('/address-confirmation')}
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
