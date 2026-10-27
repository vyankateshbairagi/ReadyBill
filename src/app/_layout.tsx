import { useEffect } from 'react';
import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <Toast />
    </>
  );
}