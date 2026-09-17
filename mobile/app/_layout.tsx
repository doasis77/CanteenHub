import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/store/auth';

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  const loadUser = useAuth((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <QueryClientProvider client={client}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ea580c' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="index" options={{ title: '🍽️ Campus Canteen' }} />
        <Stack.Screen name="cart" options={{ title: 'Cart' }} />
        <Stack.Screen name="orders" options={{ title: 'Orders' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Track Order' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
      </Stack>
    </QueryClientProvider>
  );
}
