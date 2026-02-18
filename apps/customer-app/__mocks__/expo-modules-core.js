module.exports = {
    requireNativeModule: () => ({}),
    requireNativeViewManager: () => 'View',
    EventEmitter: jest.fn(() => ({
        addListener: jest.fn(),
        removeSubscription: jest.fn(),
    })),
};
