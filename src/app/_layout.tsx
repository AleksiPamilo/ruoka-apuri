import { Stack } from 'expo-router';
import { AppThemeProvider, useAppTheme } from '../theme/AppThemeProvider';

function RootNavigator() {
    const { colors } = useAppTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background }
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AppThemeProvider>
            <RootNavigator />
        </AppThemeProvider>
    );
}