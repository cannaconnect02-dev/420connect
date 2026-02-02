import { Tabs } from 'expo-router';
import { MapPin, List, User } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0f172a',
                    borderTopColor: '#334155',
                },
                tabBarActiveTintColor: '#10b981', // Emerald 500
                tabBarInactiveTintColor: '#94a3b8',
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Radar',
                    tabBarIcon: ({ color }) => {
                        const Icon = MapPin as any;
                        return <Icon color={color} size={24} />;
                    },
                }}
            />
            <Tabs.Screen
                name="deliveries"
                options={{
                    title: 'Deliveries',
                    tabBarIcon: ({ color }) => {
                        const Icon = List as any;
                        return <Icon color={color} size={24} />;
                    },
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => {
                        const Icon = User as any;
                        return <Icon color={color} size={24} />;
                    },
                }}
            />
        </Tabs>
    );
}
