import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Search, MapPin, Star, Clock, Plus, Filter, ShoppingCart, Check, ArrowLeft } from 'lucide-react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

import { getDistanceFromLatLonInKm } from '../../lib/utils';
import { useCart } from '../../lib/CartContext';

const MAX_DISTANCE_KM = 35;

export default function HomeScreen() {
    const router = useRouter();
    const { items, addToCart } = useCart();
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
    const [topPicks, setTopPicks] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [showCartConfirmation, setShowCartConfirmation] = useState(false);
    const [lastAddedItem, setLastAddedItem] = useState<any>(null);

    const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearchAndFilter();
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, activeCategory, restaurants]);

    useEffect(() => {
        fetchUserLocationAndData();
    }, []);
    // Note: Removed fetchDataWithDistance dependencies to avoid loops, relying on explicit calls

    // ... existing fetch functions ...

    const categories = ['All', 'Flower', 'Pre-rolls', 'Vapes', 'Edibles', 'Concentrates', 'Wellness', 'Gear'];

    async function fetchUserLocationAndData() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                fetchDataWithDistance(null, null); // No user, fetch without distance
                return;
            }

            const { data: addressData } = await supabase
                .from('user_addresses')
                .select('lat, lng')
                .eq('user_id', user.id)
                .eq('is_default', true)
                .single();

            if (addressData?.lat && addressData?.lng) {
                setUserLocation({ lat: addressData.lat, lng: addressData.lng });
                fetchDataWithDistance(addressData.lat, addressData.lng);
            } else {
                fetchDataWithDistance(null, null); // No default address, fetch without distance
            }
        } catch (error) {
            console.error("Error fetching user location:", error);
            fetchDataWithDistance(null, null); // On error, fetch without distance
        }
    }

    async function handleSearchAndFilter() {
        // 1. Filter Restaurants locally (Store Name Search)
        let filteredStores = restaurants;
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filteredStores = restaurants.filter(r =>
                r.name.toLowerCase().includes(lowerQuery)
            );
        }
        setFilteredRestaurants(filteredStores);

        // 2. Fetch Filtered Products from Backend
        // Use all available nearby restaurants for product search so we find products even if store name creates no match
        if (restaurants.length === 0) {
            setTopPicks([]);
            return;
        }

        const nearbyIds = restaurants.map(r => r.id);

        // Start building query
        let query = supabase
            .from('menu_items')
            .select('*')
            .in('store_id', nearbyIds)
            .eq('is_available', true);

        // Category Filter with case-insensitivity handling
        if (activeCategory !== 'All') {
            const dbCategory = activeCategory.toLowerCase();
            query = query.eq('category', dbCategory);
        }

        // Search Filter
        if (searchQuery) {
            // Search in Name OR Description
            query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }

        const { data: mData, error } = await query.limit(20);

        if (error) {
            console.error("Error filtering products:", error);
        } else {
            console.log(`Filtered products found: ${mData?.length} for category: ${activeCategory}`);
            setTopPicks(mData || []);
        }
    }

    async function fetchDataWithDistance(userLat: number | null, userLng: number | null) {
        // Fetch all verified and open stores
        const { data: rData } = await supabase
            .from('stores')
            .select('*')
            .eq('is_verified', true)
            .eq('is_open', true);

        if (rData) {
            // Calculate distance and filter within 35km
            const restaurantsWithDistance = rData
                .map(r => ({
                    ...r,
                    distance: r.latitude && r.longitude
                        ? getDistanceFromLatLonInKm(userLat, userLng, r.latitude, r.longitude)
                        : null
                }))
                .filter(r => r.distance === null || r.distance === undefined || r.distance <= MAX_DISTANCE_KM)
                .sort((a, b) => (a.distance || 999) - (b.distance || 999));

            setRestaurants(restaurantsWithDistance);
            setFilteredRestaurants(restaurantsWithDistance); // Initialize filtered list

            // Initial Product Fetch (using default filters: All categories, empty search)
            const nearbyIds = restaurantsWithDistance.map(r => r.id);
            if (nearbyIds.length > 0) {
                const { data: mData } = await supabase
                    .from('menu_items')
                    .select('*')
                    .in('store_id', nearbyIds)
                    .eq('is_available', true)
                    .limit(10);
                if (mData) setTopPicks(mData);
            }
        }
    }

    async function fetchData() {
        // Fallback without distance filtering
        const { data: rData } = await supabase.from('stores').select('*').eq('is_verified', true).eq('is_open', true).limit(5);
        if (rData) {
            const mapped = rData.map(r => ({ ...r, distance: null }));
            setRestaurants(mapped);
            setFilteredRestaurants(mapped);
        }

        const { data: mData } = await supabase.from('menu_items').select('*').eq('is_available', true).limit(10);
        if (mData) setTopPicks(mData);
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f172a', '#020617']}
                style={styles.background}
            />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerTitle}>Discover</Text>
                        <TouchableOpacity
                            style={styles.cartButton}
                            onPress={() => router.push('/(tabs)/orders')}
                        >
                            <ShoppingCart size={24} color="white" />
                            {cartItemCount > 0 && (
                                <View style={styles.cartBadge}>
                                    <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <Search size={20} color="#94a3b8" />
                        <TextInput
                            placeholder="Find strains, edibles, oils..."
                            placeholderTextColor="#64748b"
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
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
                        <Text style={styles.sectionTitle}>
                            {searchQuery ? 'Filtered Dispensaries' : 'Nearby Dispensaries'}
                        </Text>
                        <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
                    >
                        {filteredRestaurants.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.dispensaryCard}
                                onPress={() => router.push(`/restaurant/${item.id}`)}
                            >
                                <View style={styles.dispensaryImageContainer}>
                                    <Image
                                        source={require('../../assets/dispensary-placeholder.png')}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                </View>
                                <View style={styles.dispensaryInfo}>
                                    <Text style={styles.dispensaryName} numberOfLines={1}>{item.name}</Text>
                                    <View style={styles.dispensaryMeta}>
                                        <MapPin size={14} color="#10b981" />
                                        <Text style={styles.distanceText}>
                                            {item.distance ? `${item.distance.toFixed(1)} km` : 'N/A'}
                                        </Text>
                                        <Text style={styles.dot}>•</Text>
                                        <Star size={14} color="#fbbf24" fill="#fbbf24" />
                                        <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
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
                                onPress={() => router.push(`/restaurant/${item.store_id}`)}
                            >
                                <View style={styles.productImageContainer}>
                                    <Image
                                        source={require('../../assets/product-placeholder.png')}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                    <TouchableOpacity
                                        style={styles.addBtn}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            addToCart(item, item.store_id);
                                            setLastAddedItem(item);
                                            setShowCartConfirmation(true);
                                        }}
                                    >
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

            {/* Cart Confirmation Modal */}
            {showCartConfirmation && (
                <View style={styles.cartConfirmOverlay}>
                    <View style={styles.cartConfirmContent}>
                        <View style={styles.cartConfirmIcon}>
                            <Check size={40} color="#10b981" />
                        </View>
                        <Text style={styles.cartConfirmTitle}>Added to Cart!</Text>
                        {lastAddedItem && (
                            <Text style={styles.cartConfirmItem}>{lastAddedItem.name} - R{lastAddedItem.price}</Text>
                        )}

                        <TouchableOpacity
                            style={styles.goToCartButton}
                            onPress={() => {
                                setShowCartConfirmation(false);
                                router.push('/(tabs)/orders');
                            }}
                        >
                            <ShoppingCart size={20} color="white" />
                            <Text style={styles.goToCartText}>Go to Cart</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.continueShoppingButton}
                            onPress={() => setShowCartConfirmation(false)}
                        >
                            <ArrowLeft size={18} color="#94a3b8" />
                            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cartButton: {
        position: 'relative',
        padding: 8,
    },
    cartBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
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
    },
    // Cart Confirmation Modal Styles
    cartConfirmOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    cartConfirmContent: {
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 32,
        margin: 24,
        alignItems: 'center',
        width: '85%',
        maxWidth: 340,
    },
    cartConfirmIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    cartConfirmTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    cartConfirmItem: {
        color: '#94a3b8',
        fontSize: 16,
        marginBottom: 24,
    },
    goToCartButton: {
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        gap: 10,
        width: '100%',
        marginBottom: 12,
    },
    goToCartText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    continueShoppingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        gap: 8,
    },
    continueShoppingText: {
        color: '#94a3b8',
        fontSize: 16,
    },
});
