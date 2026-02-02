/**
 * Delivery fee calculation utilities
 * Handles distance-based delivery pricing with configurable rates
 */

export interface DeliverySettings {
    baseRate: number;      // Default R30 - flat rate for deliveries within threshold
    thresholdKm: number;   // Default 5km - distance before extended rate applies
    extendedRate: number;  // Default R2.50 - rate per km beyond threshold
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
    baseRate: 30,
    thresholdKm: 5,
    extendedRate: 2.50
};

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param storeLat Store latitude
 * @param storeLng Store longitude
 * @param customerLat Customer latitude
 * @param customerLng Customer longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(
    storeLat: number,
    storeLng: number,
    customerLat: number,
    customerLng: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = (customerLat - storeLat) * Math.PI / 180;
    const dLng = (customerLng - storeLng) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(storeLat * Math.PI / 180) *
        Math.cos(customerLat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Calculate delivery fee based on distance and settings
 * 
 * Formula:
 * - If distance <= threshold: flat base rate
 * - If distance > threshold: base rate + (extended rate × excess km)
 * 
 * @param distanceKm Distance in kilometers
 * @param settings Delivery pricing settings
 * @returns Delivery fee in Rands
 */
export function calculateDeliveryFee(
    distanceKm: number,
    settings: DeliverySettings = DEFAULT_DELIVERY_SETTINGS
): number {
    const { baseRate, thresholdKm, extendedRate } = settings;

    if (distanceKm <= thresholdKm) {
        return baseRate;
    }

    const extendedDistance = distanceKm - thresholdKm;
    return baseRate + (extendedDistance * extendedRate);
}

/**
 * Parse delivery settings from database format
 * Settings are stored as JSON values in the settings table
 */
export function parseDeliverySettings(
    baseRateValue: unknown,
    thresholdKmValue: unknown,
    extendedRateValue: unknown
): DeliverySettings {
    return {
        baseRate: typeof baseRateValue === 'number'
            ? baseRateValue
            : parseFloat(String(baseRateValue)) || DEFAULT_DELIVERY_SETTINGS.baseRate,
        thresholdKm: typeof thresholdKmValue === 'number'
            ? thresholdKmValue
            : parseFloat(String(thresholdKmValue)) || DEFAULT_DELIVERY_SETTINGS.thresholdKm,
        extendedRate: typeof extendedRateValue === 'number'
            ? extendedRateValue
            : parseFloat(String(extendedRateValue)) || DEFAULT_DELIVERY_SETTINGS.extendedRate,
    };
}
