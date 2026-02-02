import { describe, it, expect } from 'vitest';
import { getNotificationCopy, shouldSendSms } from './notification-copy';

describe('Notification Copy', () => {
    const mockContext = {
        storeName: 'Test Store',
        customerName: 'John Doe',
        orderNumber: '#123',
        trackingUrl: 'http://track.me'
    };

    it('should generate correct copy for confirmed status', () => {
        const copy = getNotificationCopy('confirmed', mockContext);
        expect(copy.emailSubject).toContain('Order Confirmed');
        expect(copy.emailBody).toContain('John');
        expect(copy.emailBody).toContain('Test Store');
    });

    it('should include SMS body only for critical statuses', () => {
        const pickedUp = getNotificationCopy('picked_up', mockContext);
        expect(pickedUp.smsBody).toBeDefined();

        const confirmed = getNotificationCopy('confirmed', mockContext);
        expect(confirmed.smsBody).toBeUndefined();
    });
});

describe('SMS Triggers', () => {
    it('should trigger SMS for picked_up', () => {
        expect(shouldSendSms('picked_up')).toBe(true);
    });

    it('should NOT trigger SMS for pending', () => {
        expect(shouldSendSms('pending')).toBe(false);
    });

    it('should trigger SMS for delivering if ETA <= 5 mins', () => {
        expect(shouldSendSms('delivering', 4)).toBe(true);
    });
});
