import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";

// Unauthenticated routes. If the user is already signed in, we kick them
// over to the tabs — visiting /sign-in while signed in shouldn't keep them
// stuck on a sign-in form.
export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
