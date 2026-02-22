import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { CartProvider, useCart } from '../lib/CartContext';

describe('Cart Context Logic', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;

    it('adds items to cart correctly', () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        const product = { id: 'p1', name: 'Product 1', price: 100 };

        act(() => {
            result.current.addToCart(product, 'store1');
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0]).toEqual(expect.objectContaining({
            id: 'p1',
            name: 'Product 1',
            price: 100,
            quantity: 1,
            storeId: 'store1'
        }));
        expect(result.current.total).toBe(100);
        expect(result.current.storeId).toBe('store1');
    });

    it('increments quantity correctly', () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        const product = { id: 'p1', name: 'Product 1', price: 100 };

        act(() => {
            result.current.addToCart(product, 'store1');
            result.current.incrementQuantity('p1');
        });

        expect(result.current.items[0].quantity).toBe(2);
        expect(result.current.total).toBe(200);
    });

    it('decrements quantity correctly', () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        const product = { id: 'p1', name: 'Product 1', price: 100 };

        act(() => {
            result.current.addToCart(product, 'store1');
            result.current.incrementQuantity('p1'); // qt: 2
            result.current.decrementQuantity('p1'); // qt: 1
        });

        expect(result.current.items[0].quantity).toBe(1);
        expect(result.current.total).toBe(100);
    });

    it('removes item when quantity decrements to 0', () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        const product = { id: 'p1', name: 'Product 1', price: 100 };

        act(() => {
            result.current.addToCart(product, 'store1'); // qt: 1
            result.current.decrementQuantity('p1'); // qt: 0 -> remove
        });

        expect(result.current.items).toHaveLength(0);
        expect(result.current.storeId).toBeNull();
    });

    it('clears cart', () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        const product = { id: 'p1', name: 'Product 1', price: 100 };

        act(() => {
            result.current.addToCart(product, 'store1');
            result.current.clearCart();
        });

        expect(result.current.items).toHaveLength(0);
        expect(result.current.storeId).toBeNull();
    });
});
