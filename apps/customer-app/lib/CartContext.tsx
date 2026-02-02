import React, { createContext, useState, useContext, PropsWithChildren } from 'react';

export interface CartItem {
    id: string; // menu item id
    name: string;
    price: number;
    quantity: number;
    restaurantId: string; // To ensure we only order from one restaurant at a time
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: any, restaurantId: string) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    total: number;
    restaurantId: string | null;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: PropsWithChildren) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);

    const addToCart = (product: any, restaurantId: string) => {
        // If ordering from a different restaurant, confirm or clear (for MVP we just auto-clear/warn, here we'll just clear for simplicity)
        if (activeRestaurantId && activeRestaurantId !== restaurantId) {
            if (!confirm("Start new cart? You can only order from one restaurant at a time.")) return;
            setItems([]);
            setActiveRestaurantId(restaurantId);
        } else if (!activeRestaurantId) {
            setActiveRestaurantId(restaurantId);
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
                restaurantId
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

        if (items.length <= 1) setActiveRestaurantId(null);
    };

    const clearCart = () => {
        setItems([]);
        setActiveRestaurantId(null);
    };

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, total, restaurantId: activeRestaurantId }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
