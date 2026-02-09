import { Tabs } from 'expo-router';
import { Home, Package, User } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0f172a',
                    borderTopColor: '#334155',
                },
                tabBarActiveTintColor: '#6366f1',
                tabBarInactiveTintColor: '#94a3b8',
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="track"
                options={{
                    title: 'Track',
                    tabBarIcon: ({ color }) => <Package color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    href: null, // Hide from tab bar but keep accessible
                }}
            />
        </Tabs>
    );
}
