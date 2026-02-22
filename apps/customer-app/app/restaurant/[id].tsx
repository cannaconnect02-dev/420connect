import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Star, Clock, Plus, X, ShoppingCart, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCart } from '../../lib/CartContext';

export default function RestaurantDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [store, setStore] = useState<any>(null);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [showCartConfirmation, setShowCartConfirmation] = useState(false);
    const [lastAddedItem, setLastAddedItem] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { addToCart, items, total } = useCart();

    useEffect(() => {
        checkAuth();
        fetchData();
    }, [id]);

    async function checkAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
    }

    async function fetchData() {
        if (!id) return;

        // ... existing fetch logic ...
        // 1. Fetch Restaurant Info
        const { data: rData, error: rError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', id)
            .single();

        if (rError) console.error(rError);
        else setStore(rData);

        // 2. Fetch Menu Items
        const { data: mData, error: mError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('store_id', id);

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
                    source={store?.image_url ? { uri: store.image_url } : require('../../assets/pizza-banner.png')}
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
                    <Text style={styles.title}>{store?.name}</Text>
                    <Text style={styles.description}>{store?.description}</Text>

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
                        <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => setSelectedProduct(item)}>
                            {item.image_url && (
                                <Image
                                    source={{ uri: item.image_url }}
                                    style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
                                />
                            )}
                            <View style={styles.menuInfo}>
                                <Text style={styles.menuTitle}>{item.name}</Text>
                                <Text style={styles.menuDesc} numberOfLines={2}>{item.description}</Text>
                                <Text style={styles.menuPrice}>
                                    {isAuthenticated ? `R${item.price.toFixed(2)}` : "Login for price"}
                                </Text>
                            </View>
                            {isAuthenticated && (
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => {
                                        addToCart(item, id as string);
                                        setLastAddedItem(item);
                                        setShowCartConfirmation(true);
                                    }}
                                >
                                    <Plus size={20} color="#10b981" />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    ))}

                    {menuItems.length === 0 && (
                        <Text style={styles.emptyText}>No menu items available yet.</Text>
                    )}
                </View>
            </ScrollView>

            {/* Product Detail Modal */}
            {selectedProduct && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Image
                                source={selectedProduct.image_url ? { uri: selectedProduct.image_url } : require('../../assets/product-placeholder.png')}
                                style={styles.modalImage}
                                resizeMode="cover"
                            />
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setSelectedProduct(null)}
                            >
                                <X size={24} color="#1e293b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.modalTitleRow}>
                                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                                <Text style={styles.modalPrice}>
                                    {isAuthenticated ? `R${selectedProduct.price.toFixed(2)}` : ""}
                                </Text>
                            </View>

                            <ScrollView style={styles.modalScroll}>
                                <Text style={styles.modalDescription}>{selectedProduct.description}</Text>
                                <View style={styles.modalMeta}>
                                    <Text style={styles.modalMetaTitle}>Details</Text>
                                    <View style={styles.modalMetaRow}>
                                        <Text style={styles.modalMetaLabel}>Category:</Text>
                                        <Text style={styles.modalMetaValue}>{selectedProduct.category || 'General'}</Text>
                                    </View>
                                    {selectedProduct.thc_content && (
                                        <View style={styles.modalMetaRow}>
                                            <Text style={styles.modalMetaLabel}>THC:</Text>
                                            <Text style={styles.modalMetaValue}>{selectedProduct.thc_content}%</Text>
                                        </View>
                                    )}
                                    {selectedProduct.cbd_content && (
                                        <View style={styles.modalMetaRow}>
                                            <Text style={styles.modalMetaLabel}>CBD:</Text>
                                            <Text style={styles.modalMetaValue}>{selectedProduct.cbd_content}%</Text>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>

                            {isAuthenticated ? (
                                <TouchableOpacity
                                    style={styles.modalAddButton}
                                    onPress={() => {
                                        addToCart(selectedProduct, id as string);
                                        setSelectedProduct(null);
                                    }}
                                >
                                    <Plus size={24} color="white" />
                                    <Text style={styles.modalAddText}>Add to Cart - R{selectedProduct.price.toFixed(2)}</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.modalAddButton, { backgroundColor: '#334155' }]}
                                    onPress={() => router.push('/(auth)/sign-in')} // Assuming auth route exists, though strict nav might fail. Better to just show text.
                                >
                                    <Text style={styles.modalAddText}>Login to Order</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Cart Confirmation Modal */}
            {showCartConfirmation && (
                <View style={styles.cartConfirmOverlay}>
                    <View style={styles.cartConfirmContent}>
                        <View style={styles.cartConfirmIcon}>
                            <Check size={40} color="#10b981" />
                        </View>
                        <Text style={styles.cartConfirmTitle}>Added to Cart!</Text>
                        {lastAddedItem && (
                            <Text style={styles.cartConfirmItem}>{lastAddedItem.name} - R{lastAddedItem.price.toFixed(2)}</Text>
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
        top: 50, // Safe area
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
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
        bottom: 40, // Reduced from typical tab bar height since we're hiding it? No, keep it safe
        left: 20,
        right: 20,
        zIndex: 20,
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
    },
    // Modal Styles
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end', // Bottom sheet style
        zIndex: 50,
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%', // Takes up 80% of screen
        overflow: 'hidden',
    },
    modalHeader: {
        height: 200,
        position: 'relative',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBody: {
        flex: 1,
        padding: 24,
    },
    modalTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    modalTitle: {
        flex: 1,
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginRight: 16,
    },
    modalPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#10b981',
    },
    modalScroll: {
        flex: 1,
    },
    modalDescription: {
        fontSize: 16,
        color: '#cbd5e1',
        lineHeight: 24,
        marginBottom: 24,
    },
    modalMeta: {
        backgroundColor: '#0f172a',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    modalMetaTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 12,
    },
    modalMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    modalMetaLabel: {
        color: '#94a3b8',
        fontSize: 14,
    },
    modalMetaValue: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    modalAddButton: {
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginTop: 16,
    },
    modalAddText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
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
