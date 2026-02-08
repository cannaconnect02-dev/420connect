import React, { createContext, useState, useContext, PropsWithChildren } from 'react';

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
    clearCart: () => void;
    total: number;
    storeId: string | null;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: PropsWithChildren) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

    const addToCart = (product: any, storeId: string) => {
        // If ordering from a different store, confirm or clear (for MVP we just auto-clear/warn, here we'll just clear for simplicity)
        if (activeStoreId && activeStoreId !== storeId) {
            if (!confirm("Start new cart? You can only order from one store at a time.")) return;
            setItems([]);
            setActiveStoreId(storeId);
        } else if (!activeStoreId) {
            setActiveStoreId(storeId);
        }

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

    const removeFromCart = (itemId: string) => {
        setItems(current => {
            const existing = current.find(i => i.id === itemId);
            if (existing && existing.quantity > 1) {
                return current.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
            }
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
        <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, total, storeId: activeStoreId }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
