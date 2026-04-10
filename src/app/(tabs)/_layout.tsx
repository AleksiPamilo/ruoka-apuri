import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#007AFF',
                tabBarInactiveTintColor: '#8E8E93',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 0.5,
                    borderTopColor: 'D1D1D6'
                },
                headerShown: true,
                headerTitleStyle: {
                    fontWeight: '600'
                }
            }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Ruoka-apuri',
                        tabBarLabel: 'Koti',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="restaurant-outline" color={color} size={size} />
                        )
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: 'Asetukset',
                        tabBarLabel: 'Asetukset',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="settings-outline" color={color} size={size} />
                        )
                    }}
                />
            </Tabs>
    )
}