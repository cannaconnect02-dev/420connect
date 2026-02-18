import { describe, it, expect } from 'vitest';
import { calculateCustomerPrice, calculateMarkupAmount } from './pricing';

describe('Pricing Utility Functions', () => {
    describe('calculateCustomerPrice', () => {
        it('should calculate price correctly with standard inputs', () => {
            // R100 base + 20% markup = 120 -> ceil(120/5)*5 = 120
            expect(calculateCustomerPrice(100, 20)).toBe(120);

            // R100 base + 50% markup = 150 -> ceil(150/5)*5 = 150
            expect(calculateCustomerPrice(100, 50)).toBe(150);
        });

        it('should round up to the nearest 5', () => {
            // R100 base + 21% markup = 121 -> ceil(121/5)*5 = 125
            expect(calculateCustomerPrice(100, 21)).toBe(125);

            // R100 base + 24% markup = 124 -> ceil(124/5)*5 = 125
            expect(calculateCustomerPrice(100, 24)).toBe(125);

            // R100 base + 26% markup = 126 -> ceil(126/5)*5 = 130
            expect(calculateCustomerPrice(100, 26)).toBe(130);
        });

        it('should handle decimals in base price efficiently', () => {
            // R99.50 base + 20% markup = 119.4 -> ceil(119.4/5)*5 = 120
            expect(calculateCustomerPrice(99.50, 20)).toBe(120);

            // R10.50 base + 10% markup = 11.55 -> ceil(11.55/5)*5 = 15
            expect(calculateCustomerPrice(10.50, 10)).toBe(15);
        });

        it('should return 0 for non-positive inputs', () => {
            expect(calculateCustomerPrice(-100, 20)).toBe(0);
            expect(calculateCustomerPrice(100, -20)).toBe(0);
            expect(calculateCustomerPrice(0, 20)).toBe(0);
        });
    });

    describe('calculateMarkupAmount', () => {
        it('should calculate precise markup amount', () => {
            // R100 * 20% = 20
            expect(calculateMarkupAmount(100, 20)).toBe(20);

            // R150 * 50% = 75
            expect(calculateMarkupAmount(150, 50)).toBe(75);

            // R10.50 * 10% = 1.05
            expect(calculateMarkupAmount(10.50, 10)).toBe(1.05);
        });

        it('should return 0 for non-positive inputs', () => {
            expect(calculateMarkupAmount(-100, 20)).toBe(0);
        });
    });
});
