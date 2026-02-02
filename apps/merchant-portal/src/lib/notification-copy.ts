// Centralized notification copy for order status updates
// Used for consistency between frontend display and edge function

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivering' | 'delivered' | 'cancelled';

export interface NotificationCopy {
    emailSubject: string;
    emailBody: string;
    smsBody?: string; // Only for critical statuses
    trackingUrl: string;
}

export interface NotificationContext {
    storeName: string;
    driverName?: string;
    customerName: string;
    orderNumber: string;
    trackingUrl?: string;
    etaMinutes?: number;
    deliveredAt?: string;
}

/**
 * Get warm, humanized notification copy for order status updates
 */
export function getNotificationCopy(
    status: OrderStatus,
    context: NotificationContext
): NotificationCopy {
    const firstName = context.customerName?.split(' ')[0] || 'there';
    const trackingUrl = context.trackingUrl || '';

    switch (status) {
        case 'confirmed':
            return {
                emailSubject: `Order Confirmed! ${context.storeName} is on it 🎉`,
                emailBody: `Hey ${firstName}! Great news – ${context.storeName} has accepted your order (${context.orderNumber}) and is getting started right away. Estimated ready time: 15-20 minutes.`,
                trackingUrl,
            };

        case 'preparing':
            return {
                emailSubject: `Your order is being crafted with care ✨`,
                emailBody: `Good news, ${firstName}! ${context.storeName} is now preparing your order (${context.orderNumber}). We'll let you know when it's ready for pickup.`,
                trackingUrl,
            };

        case 'ready':
            return {
                emailSubject: `Your order is ready! Finding your driver... 🚗`,
                emailBody: `Great news! Your order (${context.orderNumber}) from ${context.storeName} is perfectly packed and ready. We're matching you with a driver who knows your area best.`,
                trackingUrl,
            };

        case 'picked_up':
            return {
                emailSubject: `${context.driverName || 'Your driver'} has your order! 🚀`,
                emailBody: `Meet ${context.driverName || 'your driver'}! They just picked up your order (${context.orderNumber}) from ${context.storeName} and are heading your way.`,
                smsBody: `${context.driverName || 'Your driver'} has your order! Track live: ${trackingUrl}`,
                trackingUrl,
            };

        case 'delivering':
            if (context.etaMinutes && context.etaMinutes <= 5) {
                return {
                    emailSubject: `Almost there! 🏃`,
                    emailBody: `${context.driverName || 'Your driver'} is just ${context.etaMinutes} minutes away with your order (${context.orderNumber}). Keep an eye out!`,
                    smsBody: `${context.driverName || 'Your driver'} is ${context.etaMinutes} mins away!`,
                    trackingUrl,
                };
            }
            return {
                emailSubject: `${context.driverName || 'Your driver'} is on the way! 🚗`,
                emailBody: `${context.driverName || 'Your driver'} is making their way to you with your order (${context.orderNumber}).`,
                trackingUrl,
            };

        case 'delivered':
            return {
                emailSubject: `Your order has arrived! 🎁`,
                emailBody: `Your order (${context.orderNumber}) was delivered${context.deliveredAt ? ` at ${context.deliveredAt}` : ''}. We hope you love it!`,
                smsBody: `Delivered! Enjoy your order 🎉`,
                trackingUrl,
            };

        case 'cancelled':
            return {
                emailSubject: `Order Cancelled`,
                emailBody: `Your order (${context.orderNumber}) has been cancelled. If you have any questions, please contact support.`,
                trackingUrl,
            };

        default:
            return {
                emailSubject: `Order Update: ${context.orderNumber}`,
                emailBody: `Your order (${context.orderNumber}) status has been updated.`,
                trackingUrl,
            };
    }
}

/**
 * Statuses that should trigger SMS notifications
 */
export const SMS_NOTIFICATION_STATUSES: OrderStatus[] = ['picked_up', 'delivered'];

/**
 * Check if a status change should trigger an SMS notification
 */
export function shouldSendSms(status: OrderStatus, etaMinutes?: number): boolean {
    if (SMS_NOTIFICATION_STATUSES.includes(status)) return true;
    if (status === 'delivering' && etaMinutes && etaMinutes <= 5) return true;
    return false;
}
