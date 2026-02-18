/**
 * Pricing Utility Functions
 */

/**
 * Calculates the final customer price based on base price and markup percentage.
 * Formula: Base + (Base * Markup%) -> Rounded up to nearest 5.
 * 
 * @param basePrice The merchant's cost (base price)
 * @param markupPercent The global markup percentage
 * @returns The calculated final price (number)
 */
export function calculateCustomerPrice(basePrice: number, markupPercent: number): number {
    if (basePrice < 0 || markupPercent < 0) return 0;

    // Calculate raw price with markup
    const rawPrice = basePrice + (basePrice * (markupPercent / 100));

    // Round up to nearest 5
    const roundedPrice = Math.ceil(rawPrice / 5) * 5;

    return roundedPrice;
}

/**
 * Calculates the markup amount.
 * 
 * @param basePrice The merchant's cost
 * @param markupPercent The markup percentage
 * @returns The monetary value of the markup
 */
export function calculateMarkupAmount(basePrice: number, markupPercent: number): number {
    if (basePrice < 0 || markupPercent < 0) return 0;
    return basePrice * (markupPercent / 100);
}
