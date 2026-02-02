import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Star, Clock, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Would need install, stick to View for now or minimal deps?
// LinearGradient is standard in Expo, but let's assume safely.
import { useCart } from '../../lib/CartContext';

export default function RestaurantDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [restaurant, setRestaurant] = useState<any>(null);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToCart, items, total } = useCart();

    useEffect(() => {
        fetchData();
    }, [id]);

    async function fetchData() {
        if (!id) return;

        // 1. Fetch Restaurant Info
        const { data: rData, error: rError } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', id)
            .single();

        if (rError) console.error(rError);
        else setRestaurant(rData);

        // 2. Fetch Menu Items
        const { data: mData, error: mError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', id);

        if (mError) console.error(mError);
        else setMenuItems(mData || []);

        setLoading(false);
    }

    if (loading) {
        return <View style={styles.loading}><ActivityIndicator size="large" color="#10b981" /></View>;
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header Image */}
            <View style={styles.header}>
                <Image
                    source={require('../../assets/pizza-banner.png')}
                    style={styles.bannerImage}
                    resizeMode="cover"
                />
                <View style={styles.headerOverlay} />

                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* Restaurant Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.title}>{restaurant?.name}</Text>
                    <Text style={styles.description}>{restaurant?.description}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Star size={16} color="#fbbf24" fill="#fbbf24" />
                            <Text style={styles.metaText}>4.8 (1.2k)</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Clock size={16} color="#94a3b8" />
                            <Text style={styles.metaText}>25-35 min</Text>
                        </View>
                    </View>
                </View>

                {/* Menu Section */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Menu</Text>

                    {menuItems.map((item) => (
                        <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => addToCart(item, id as string)}>
                            <View style={styles.menuInfo}>
                                <Text style={styles.menuTitle}>{item.name}</Text>
                                <Text style={styles.menuDesc} numberOfLines={2}>{item.description}</Text>
                                <Text style={styles.menuPrice}>R{item.price}</Text>
                            </View>
                            <View style={styles.addButton}>
                                <Plus size={20} color="#10b981" />
                            </View>
                        </TouchableOpacity>
                    ))}

                    {menuItems.length === 0 && (
                        <Text style={styles.emptyText}>No menu items available yet.</Text>
                    )}
                </View>
            </ScrollView>

            {/* Floating Cart Button */}
            {items.length > 0 && (
                <View style={styles.floatingCartContainer}>
                    <TouchableOpacity style={styles.floatingCart} onPress={() => router.push('/(tabs)/orders' as any)}>
                        <View style={styles.cartCountBadge}>
                            <Text style={styles.cartCountText}>{items.reduce((acc, i) => acc + i.quantity, 0)}</Text>
                        </View>
                        <Text style={styles.viewCartText}>View Cart</Text>
                        <Text style={styles.cartTotalText}>R{total.toFixed(2)}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    loading: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        height: 250,
        width: '100%',
        position: 'relative',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginTop: -20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: '#0f172a',
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    infoSection: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 16,
        lineHeight: 22,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1e293b',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    metaText: {
        color: 'white',
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
    },
    menuSection: {
        paddingBottom: 100, // Extra padding for floating button
    },
    menuItem: {
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    menuInfo: {
        flex: 1,
        marginRight: 16,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    menuDesc: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 8,
    },
    menuPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#10b981',
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#10b981',
    },
    emptyText: {
        color: '#64748b',
        textAlign: 'center',
        marginTop: 20,
    },
    floatingCartContainer: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
    },
    floatingCart: {
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    cartCountBadge: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartCountText: {
        color: 'white',
        fontWeight: 'bold',
    },
    viewCartText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cartTotalText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
