import * as SecureStore from "expo-secure-store";

// Clerk's expected TokenCache shape. Uses expo-secure-store so the session
// token survives app restarts (Keychain on iOS, Keystore on Android).
export const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error("[token-cache] getToken failed", err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error("[token-cache] saveToken failed", err);
    }
  },
};
