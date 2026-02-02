import { describe, it, expect } from 'vitest';
import { calculateDeliveryFee, calculateDistance } from './delivery-fee';

describe('Delivery Fee Calculation', () => {
    it('should return base rate for distance within threshold', () => {
        const fee = calculateDeliveryFee(3, { baseRate: 30, thresholdKm: 5, extendedRate: 2.5 });
        expect(fee).toBe(30);
    });

    it('should return base + extended rate for distance exceeding threshold', () => {
        // 10km total. 5km base. 5km excess. 30 + (5 * 2.5) = 42.5
        const fee = calculateDeliveryFee(10, { baseRate: 30, thresholdKm: 5, extendedRate: 2.5 });
        expect(fee).toBe(42.5);
    });

    it('should handle custom settings', () => {
        const settings = { baseRate: 50, thresholdKm: 3, extendedRate: 5 };
        // 5km total. 3km base. 2km excess. 50 + (2 * 5) = 60
        const fee = calculateDeliveryFee(5, settings);
        expect(fee).toBe(60);
    });
});

describe('Distance Calculation', () => {
    it('should calculate rough distance between two points', () => {
        // Simple check: same point should be 0
        const dist = calculateDistance(0, 0, 0, 0);
        expect(dist).toBe(0);
    });
});
