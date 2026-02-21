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

// Mock React Native Webview
jest.mock('react-native-webview', () => {
    const { View } = require('react-native');
    return {
        WebView: (props: any) => <View testID="mock-webview" {...props} />
    };
});

// Mock Paystack Webview
jest.mock('react-native-paystack-webview', () => {
    const popupMock = {
        checkout: jest.fn(),
    };
    return {
        usePaystack: () => ({ popup: popupMock }),
        PaystackProvider: ({ children }: any) => children,
    };
});

// Mock Gesture Handler
jest.mock('react-native-gesture-handler', () => {
    const { View } = require('react-native');
    const DummyView = (props: any) => <View {...props} />;

    return {
        Swipeable: DummyView,
        DrawerLayout: DummyView,
        State: {},
        ScrollView: DummyView,
        Slider: DummyView,
        Switch: DummyView,
        TextInput: DummyView,
        ToolbarAndroid: DummyView,
        ViewPagerAndroid: DummyView,
        DrawerLayoutAndroid: DummyView,
        WebView: DummyView,
        NativeViewGestureHandler: DummyView,
        TapGestureHandler: DummyView,
        FlingGestureHandler: DummyView,
        ForceTouchGestureHandler: DummyView,
        LongPressGestureHandler: DummyView,
        PanGestureHandler: DummyView,
        PinchGestureHandler: DummyView,
        RotationGestureHandler: DummyView,
        RawButton: DummyView,
        BaseButton: DummyView,
        RectButton: DummyView,
        BorderlessButton: DummyView,
        FlatList: DummyView,
        gestureHandlerRootHOC: jest.fn((Component) => Component),
        Directions: {},
        GestureHandlerRootView: DummyView,
    };
});

// Mock Environment Variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
