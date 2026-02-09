import React, { createContext, useState, useContext, PropsWithChildren } from 'react';
import { Alert } from 'react-native';

export interface CartItem {
    id: string; // menu item id
    name: string;
    price: number;
    quantity: number;
    storeId: string; // To ensure we only order from one store at a time
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: any, storeId: string) => void;
    removeFromCart: (itemId: string) => void;
    incrementQuantity: (itemId: string) => void;
    decrementQuantity: (itemId: string) => void;
    clearCart: () => void;
    total: number;
    storeId: string | null;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: PropsWithChildren) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

    const addItemToCart = (product: any, storeId: string) => {
        setItems(current => {
            const existing = current.find(i => i.id === product.id);
            if (existing) {
                return current.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...current, {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                storeId
            }];
        });
    };

    const addToCart = (product: any, storeId: string) => {
        // If ordering from a different store, show confirmation alert
        if (activeStoreId && activeStoreId !== storeId) {
            Alert.alert(
                "Start New Cart?",
                "You can only order from one store at a time. Clear your current cart?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Clear & Add",
                        style: "destructive",
                        onPress: () => {
                            setItems([]);
                            setActiveStoreId(storeId);
                            addItemToCart(product, storeId);
                        }
                    }
                ]
            );
            return;
        }

        if (!activeStoreId) {
            setActiveStoreId(storeId);
        }

        addItemToCart(product, storeId);
    };

    const removeFromCart = (itemId: string) => {
        setItems(current => current.filter(i => i.id !== itemId));
        if (items.length <= 1) setActiveStoreId(null);
    };

    const incrementQuantity = (itemId: string) => {
        setItems(current => current.map(i => i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i));
    };

    const decrementQuantity = (itemId: string) => {
        setItems(current => {
            const existing = current.find(i => i.id === itemId);
            if (existing && existing.quantity > 1) {
                return current.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
            }
            // If quantity is 1, remove item
            return current.filter(i => i.id !== itemId);
        });
        if (items.length <= 1) setActiveStoreId(null);
    };

    const clearCart = () => {
        setItems([]);
        setActiveStoreId(null);
    };

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, incrementQuantity, decrementQuantity, clearCart, total, storeId: activeStoreId }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);

