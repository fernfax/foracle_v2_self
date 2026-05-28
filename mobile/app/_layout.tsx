import "../global.css";

import { ClerkProvider } from "@clerk/clerk-expo";
import { DMSans_400Regular, DMSans_500Medium } from "@expo-google-fonts/dm-sans";
import {
  Lora_400Regular_Italic,
} from "@expo-google-fonts/lora";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
} from "@expo-google-fonts/space-grotesk";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { tokenCache } from "@/src/lib/token-cache";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Keep the splash up until fonts have loaded — otherwise the first frame
// renders with the system font fallback and visibly re-flows when the brand
// fonts arrive.
SplashScreen.preventAutoHideAsync().catch(() => {
  // It's fine if this races and rejects on hot reload.
});

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

function AppProviders({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {children}
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

function AppStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Modal" }}
      />
    </Stack>
  );
}

function MissingClerkKeyScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FBF7F1",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#1C2B2A" }}>
        Clerk publishable key not set
      </Text>
      <Text
        style={{ fontSize: 14, color: "#2C3E3D", textAlign: "center", lineHeight: 20 }}
      >
        Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to mobile/.env.local, then
        restart Metro with `npx expo start --clear`.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    Lora_400Regular_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1 },
        },
      })
  );

  if (!PUBLISHABLE_KEY) {
    return <MissingClerkKeyScreen />;
  }

  // Don't render the tree until fonts are ready — avoids a visible flash
  // where text re-renders in the brand font after the first paint.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <AppProviders>
          <AppStack />
        </AppProviders>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
