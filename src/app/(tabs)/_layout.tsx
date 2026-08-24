import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/AppThemeProvider';

export default function TabsLayout() {
    const { colors } = useAppTheme();
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom, Platform.OS === 'web' ? 24 : 12);

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.tabInactive,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopWidth: 0.5,
                    borderTopColor: colors.border,
                    height: 60 + bottomPadding,
                    paddingTop: 4,
                    paddingBottom: bottomPadding,
                },
                tabBarIconStyle: {
                    marginBottom: 1,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
                headerShown: false,
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
                        tabBarIcon: ({ color }) => (
                            <Ionicons name="restaurant-outline" color={color} size={22} />
                        )
                    }}
                />
                <Tabs.Screen
                    name="calendar"
                    options={{
                        title: 'Kalenteri',
                        tabBarLabel: 'Kalenteri',
                        tabBarIcon: ({ color }) => (
                            <Ionicons name="calendar-outline" color={color} size={22} />
                        )
                    }}
                />
                <Tabs.Screen
                    name="shopping-list"
                    options={{
                        title: 'Ostoslista',
                        tabBarLabel: 'Ostoslista',
                        tabBarIcon: ({ color }) => (
                            <Ionicons name="cart-outline" color={color} size={22} />
                        )
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: 'Asetukset',
                        tabBarLabel: 'Asetukset',
                        tabBarIcon: ({ color }) => (
                            <Ionicons name="settings-outline" color={color} size={22} />
                        )
                    }}
                />
            </Tabs>
    )
}