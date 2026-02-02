import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Search, MapPin, Star, Clock, Plus, Filter } from 'lucide-react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

const MAX_DISTANCE_KM = 35;

// Haversine formula for distance calculation
function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function HomeScreen() {
    const router = useRouter();
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [topPicks, setTopPicks] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState('Flower');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        fetchUserLocationAndData();
    }, []);

    async function fetchUserLocationAndData() {
        // Get user's confirmed delivery location from profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('delivery_lat, delivery_lng')
                .eq('id', user.id)
                .single();

            if (profile?.delivery_lat && profile?.delivery_lng) {
                setUserLocation({ lat: profile.delivery_lat, lng: profile.delivery_lng });
                fetchDataWithDistance(profile.delivery_lat, profile.delivery_lng);
                return;
            }
        }

        // Fallback: fetch without distance filtering
        fetchData();
    }

    async function fetchDataWithDistance(userLat: number, userLng: number) {
        // Fetch all active restaurants
        const { data: rData } = await supabase
            .from('restaurants')
            .select('*')
            .eq('is_active', true);

        if (rData) {
            // Calculate distance and filter within 35km
            const restaurantsWithDistance = rData
                .map(r => ({
                    ...r,
                    distance: r.latitude && r.longitude
                        ? calculateDistanceKm(userLat, userLng, r.latitude, r.longitude)
                        : null
                }))
                .filter(r => r.distance === null || r.distance <= MAX_DISTANCE_KM)
                .sort((a, b) => (a.distance || 999) - (b.distance || 999));

            setRestaurants(restaurantsWithDistance);

            // Fetch menu items only from nearby restaurants
            const nearbyIds = restaurantsWithDistance.map(r => r.id);
            if (nearbyIds.length > 0) {
                const { data: mData } = await supabase
                    .from('menu_items')
                    .select('*')
                    .in('restaurant_id', nearbyIds)
                    .eq('is_available', true)
                    .limit(6);
                if (mData) setTopPicks(mData);
            }
        }
    }

    async function fetchData() {
        // Fallback without distance filtering
        const { data: rData } = await supabase.from('restaurants').select('*').eq('is_active', true).limit(5);
        if (rData) setRestaurants(rData.map(r => ({ ...r, distance: null })));

        const { data: mData } = await supabase.from('menu_items').select('*').eq('is_available', true).limit(6);
        if (mData) setTopPicks(mData);
    }

    const categories = ['Flower', 'Pre-rolls', 'Vapes', 'Edibles', 'Extracts', 'Gear'];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f172a', '#020617']}
                style={styles.background}
            />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Discover</Text>

                    <View style={styles.searchContainer}>
                        <Search size={20} color="#94a3b8" />
                        <TextInput
                            placeholder="Find strains, edibles, oils..."
                            placeholderTextColor="#64748b"
                            style={styles.searchInput}
                        />
                    </View>

                    {/* Categories */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
                                onPress={() => setActiveCategory(cat)}
                            >
                                <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Nearby Dispensaries */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Nearby Dispensaries</Text>
                        <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
                    </View>

                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={restaurants}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.dispensaryCard}
                                onPress={() => router.push(`/restaurant/${item.id}`)}
                            >
                                <View style={styles.dispensaryImageContainer}>
                                    <Image
                                        source={require('../../assets/dispensary-placeholder.png')}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.timeBadge}>
                                        <Clock size={12} color="white" />
                                        <Text style={styles.timeText}>20-30 min</Text>
                                    </View>
                                </View>
                                <View style={styles.dispensaryInfo}>
                                    <Text style={styles.dispensaryName} numberOfLines={1}>{item.name}</Text>
                                    <View style={styles.dispensaryMeta}>
                                        <Star size={14} color="#fbbf24" fill="#fbbf24" />
                                        <Text style={styles.ratingText}>4.6</Text>
                                        <Text style={styles.dot}>•</Text>
                                        <MapPin size={14} color="#94a3b8" />
                                        <Text style={styles.distanceText}>
                                            {item.distance ? `${item.distance.toFixed(1)}km` : 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* Top Shelf Picks */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Top Shelf Picks</Text>
                    </View>

                    <View style={styles.grid}>
                        {topPicks.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.productCard}
                                onPress={() => router.push(`/restaurant/${item.restaurant_id}`)}
                            >
                                <View style={styles.productImageContainer}>
                                    <Image
                                        source={require('../../assets/product-placeholder.png')}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                    <TouchableOpacity style={styles.addBtn}>
                                        <Plus size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.productInfo}>
                                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.productPrice}>R{item.price}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617', // Very dark slate/black
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: '100%',
    },
    scrollContent: {
        paddingTop: 60,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
        textAlign: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 24,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        color: 'white',
        fontSize: 16,
    },
    categoriesScroll: {
        flexDirection: 'row',
        overflow: 'visible',
    },
    categoryPill: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    categoryPillActive: {
        backgroundColor: '#10b981', // Emerald green
        borderColor: '#10b981',
    },
    categoryText: {
        color: '#94a3b8',
        fontWeight: '600',
    },
    categoryTextActive: {
        color: 'white',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    seeAll: {
        color: '#10b981',
        fontSize: 14,
    },
    // Dispensary Cards
    dispensaryCard: {
        width: 200,
        backgroundColor: '#1e293b',
        borderRadius: 16,
        overflow: 'hidden',
    },
    dispensaryImageContainer: {
        height: 120,
        backgroundColor: '#334155',
        position: 'relative',
    },
    placeholderImg: {
        flex: 1,
        backgroundColor: '#475569',
    },
    timeBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    timeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    dispensaryInfo: {
        padding: 12,
    },
    dispensaryName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    dispensaryMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    dot: {
        color: '#64748b',
        fontSize: 12,
    },
    distanceText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    // Product Grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 16,
    },
    productCard: {
        width: '47%', // roughly half - gap
        backgroundColor: '#1e293b',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 8,
    },
    productImageContainer: {
        height: 140,
        backgroundColor: '#334155',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#475569', // Replace with Image
    },
    addBtn: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productInfo: {
        padding: 12,
    },
    productName: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    productPrice: {
        color: '#10b981',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
