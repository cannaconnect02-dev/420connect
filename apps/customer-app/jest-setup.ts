import '@testing-library/jest-native/extend-expect';

const createSupabaseMock = () => {
    const builder = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: {}, error: null })), // Allow awaiting the builder
    };
    return builder;
};

const mockSupabase = {
    auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        verifyOtp: jest.fn(),
        resend: jest.fn(),
        updateUser: jest.fn(),
        getUser: jest.fn(),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
        signOut: jest.fn(),
        refreshSession: jest.fn(),
    },
    from: jest.fn(() => createSupabaseMock()),
};

jest.mock('./lib/supabase', () => ({
    supabase: mockSupabase,
}));

// Mock Expo Router
jest.mock('expo-router', () => ({
    useRouter: jest.fn(() => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
    })),
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    Stack: {
        Screen: jest.fn(() => null),
    },
}));

// Mock Expo Location
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } })),
    reverseGeocodeAsync: jest.fn(() => Promise.resolve([{ street: '123 Test St', city: 'Test City' }])),
    geocodeAsync: jest.fn(() => Promise.resolve([{ latitude: 0, longitude: 0 }])),
}));

// Mock Lucide Icons
jest.mock('lucide-react-native', () => ({
    Mail: 'Mail',
    ArrowLeft: 'ArrowLeft',
    Lock: 'Lock',
    Eye: 'Eye',
    EyeOff: 'EyeOff',
    ShoppingBag: 'ShoppingBag',
    User: 'User',
    Calendar: 'Calendar',
    MapPin: 'MapPin',
    Navigation: 'Navigation',
    CheckCircle: 'CheckCircle',
    CheckCircle2: 'CheckCircle2',
    CreditCard: 'CreditCard',
    LogOut: 'LogOut',
    Edit2: 'Edit2',
    Phone: 'Phone',
    RefreshCw: 'RefreshCw',
    Search: 'Search',
    Star: 'Star',
    Clock: 'Clock',
    Plus: 'Plus',
    Minus: 'Minus',
    Filter: 'Filter',
    Trash2: 'Trash2',
    ChevronRight: 'ChevronRight',
    ShieldCheck: 'ShieldCheck',
    X: 'X',
    ShoppingCart: 'ShoppingCart',
    Check: 'Check',
    Package: 'Package',
    ChefHat: 'ChefHat',
    Truck: 'Truck',
    Store: 'Store',
    MessageCircle: 'MessageCircle',
    Home: 'Home',
    XCircle: 'XCircle',
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock LinearGradient
// Mock Expo Modules Core
jest.mock('expo-modules-core', () => ({
    requireNativeModule: jest.fn(),
    requireNativeViewManager: jest.fn(() => 'View'),
    EventEmitter: jest.fn(() => ({
        addListener: jest.fn(),
        removeSubscription: jest.fn(),
    })),
}));
