import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/AppThemeProvider';

export default function TabsLayout() {
    const { colors } = useAppTheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.tabInactive,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopWidth: 0.5,
                    borderTopColor: colors.border
                },
                headerShown: true,
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTitleStyle: {
                    fontWeight: '600',
                    color: colors.text,
                },
                headerTintColor: colors.primary,
                sceneStyle: {
                    backgroundColor: colors.background,
                },
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
                    name="calendar"
                    options={{
                        title: 'Kalenteri',
                        tabBarLabel: 'Kalenteri',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="calendar-outline" color={color} size={size} />
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