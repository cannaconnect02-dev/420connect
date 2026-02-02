import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { NanoTheme } from '../../constants/nanobanana';
import StatCard from '../../components/nanobanana/StatCard';
import { Settings, CreditCard, HelpCircle, LogOut, ChevronRight, User, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export default function ProfileScreen() {
    const [profile, setProfile] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        getProfile();
    }, []);

    async function getProfile() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (e: any) {
            console.log(e.message);
        }
    }

    async function pickImage() {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'We need access to your photos to upload a profile picture.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true, // Important for Supabase upload
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                uploadAvatar(result.assets[0]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    }

    async function uploadAvatar(image: ImagePicker.ImagePickerAsset) {
        if (uploading) return;
        setUploading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No user logged in");

            const userId = session.user.id;
            const filePath = `${userId}/${Date.now()}.png`;
            const contentType = 'image/png';

            if (!image.base64) throw new Error("No image data");

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(image.base64), {
                    contentType,
                    upsert: true
                });

            if (uploadError) {
                // If bucket doesn't exist, this fails. We assume 'avatars' exists.
                throw uploadError;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            // 4. Update local state
            setProfile({ ...profile, avatar_url: publicUrl });
            Alert.alert("Success", "Profile picture updated!");

        } catch (error: any) {
            console.error(error);
            Alert.alert("Upload Failed", error.message || "Could not upload image.");
        } finally {
            setUploading(false);
        }
    }

    async function handleSignOut() {
        await supabase.auth.signOut();
    }

    const MenuItem = ({ icon, label, onPress }: { icon: any, label: string, onPress?: () => void }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuLeft}>
                {icon}
                <Text style={styles.menuText}>{label}</Text>
            </View>
            <ChevronRight size={20} color={NanoTheme.colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} disabled={uploading}>
                    {uploading ? (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <ActivityIndicator color={NanoTheme.colors.primary} />
                        </View>
                    ) : profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <User size={40} color={NanoTheme.colors.primary} />
                        </View>
                    )}

                    {/* Camera Icon Overlay */}
                    {!uploading && (
                        <View style={styles.editIcon}>
                            <Camera size={14} color="black" />
                        </View>
                    )}
                </TouchableOpacity>
                <Text style={styles.name}>{profile?.full_name || 'Driver'}</Text>
                <Text style={styles.driverId}>ID: {profile?.id?.slice(0, 8).toUpperCase() || 'DRV-UNKNOWN'}</Text>
            </View>

            {/* Metrics Grid */}
            <View style={styles.statsGrid}>
                <StatCard label="Earnings" value="R850.50" />
                <StatCard label="Trips" value="12" />
                <StatCard label="Rating" value="4.9 ★" />
            </View>

            {/* Menu */}
            <View style={styles.menuContainer}>
                <MenuItem
                    icon={<Settings size={20} color={NanoTheme.colors.text} />}
                    label="Vehicle Information"
                    onPress={() => Alert.alert("Coming Soon", "Edit Vehicle Info")}
                />
                <MenuItem
                    icon={<CreditCard size={20} color={NanoTheme.colors.text} />}
                    label="Banking & Payouts"
                    onPress={() => Alert.alert("Coming Soon", "Banking Details")}
                />
                <MenuItem
                    icon={<HelpCircle size={20} color={NanoTheme.colors.text} />}
                    label="Help & Support"
                    onPress={() => Alert.alert("Coming Soon", "Support Center")}
                />
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
                <LogOut size={20} color={NanoTheme.colors.error} />
                <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NanoTheme.colors.background,
    },
    header: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 30,
        backgroundColor: NanoTheme.colors.backgroundAlt,
        borderBottomWidth: 1,
        borderColor: NanoTheme.colors.border,
    },
    avatarContainer: {
        marginBottom: 16,
        shadowColor: NanoTheme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: NanoTheme.colors.primary,
    },
    avatarPlaceholder: {
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    driverId: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 14,
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    editIcon: {
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
        borderColor: NanoTheme.colors.backgroundAlt,
    },
    statsGrid: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    menuContainer: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: NanoTheme.colors.backgroundAlt,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: NanoTheme.colors.border,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    logoutBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 20,
        marginTop: 10,
        padding: 16,
        gap: 8,
    },
    logoutText: {
        color: NanoTheme.colors.error,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
