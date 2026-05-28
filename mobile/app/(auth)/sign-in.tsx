import { useSignIn } from "@clerk/clerk-expo";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MotifStrip } from "@/src/ui/MotifStrip";
import { SectionLabel } from "@/src/ui/SectionLabel";

// Email + 6-digit code sign-in. Mirrors what Clerk's web flow does, just
// rendered native. New users still sign up via the web for now — sign-up
// on mobile is a separate slice.
export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!isLoaded || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const attempt = await signIn.create({ identifier: email.trim() });
      const emailFactor = attempt.supportedFirstFactors?.find(
        (f) => f.strategy === "email_code"
      );
      if (!emailFactor || !("emailAddressId" in emailFactor)) {
        throw new Error("This account doesn't support email-code sign-in.");
      }
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId as string,
      });
      setStage("code");
    } catch (err) {
      setError(clerkErrorMessage(err) ?? "Couldn't send the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // Clerk throws a custom shape `{ errors: [{ message, longMessage, ... }] }`
  // instead of a regular Error. Extract the best human-readable message.
  function clerkErrorMessage(err: unknown): string | null {
    if (err && typeof err === "object" && "errors" in err) {
      const arr = (err as { errors?: Array<{ message?: string; longMessage?: string }> })
        .errors;
      const first = Array.isArray(arr) ? arr[0] : undefined;
      if (first?.longMessage) return first.longMessage;
      if (first?.message) return first.message;
    }
    if (err instanceof Error) return err.message;
    return null;
  }

  async function verifyCode() {
    if (!isLoaded || code.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code.trim(),
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        // The (auth) layout's Redirect will route us into the tabs as soon as
        // isSignedIn flips. No manual navigation needed.
      } else {
        setError(`Unexpected sign-in status: ${attempt.status}`);
      }
    } catch (err) {
      setError(clerkErrorMessage(err) ?? "Couldn't verify that code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
      className="bg-background"
    >
      <View style={{ paddingTop: insets.top }}>
        <MotifStrip variant="thick" />
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 40,
          paddingBottom: 32,
          paddingHorizontal: 24,
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3">
          <SectionLabel>Welcome back</SectionLabel>
          <Text
            className="font-display text-foreground"
            style={{ fontSize: 40, letterSpacing: -0.5, lineHeight: 44 }}
          >
            foracle
          </Text>
          <Text
            className="font-editorial text-foreground/70"
            style={{ fontSize: 16, lineHeight: 24 }}
          >
            {stage === "email"
              ? "Sign in to pick up where you left off."
              : `Enter the 6-digit code we sent to ${email}.`}
          </Text>
        </View>

        {stage === "email" ? (
          <View className="gap-3">
            <Text className="text-xs uppercase tracking-wide text-muted-foreground">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#94908A"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              className="rounded-2xl bg-cream px-4 py-4 text-base text-foreground"
            />
            <Pressable
              onPress={sendCode}
              disabled={busy || !email.trim()}
              className="rounded-2xl bg-primary px-5 py-4 mt-2 active:opacity-80 disabled:opacity-50"
            >
              {busy ? (
                <ActivityIndicator color="#FBF7F1" />
              ) : (
                <Text className="text-primary-foreground text-center font-semibold">
                  Continue
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View className="gap-3">
            <Text className="text-xs uppercase tracking-wide text-muted-foreground">
              6-digit code
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor="#94908A"
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              className="rounded-2xl bg-cream px-4 py-4 text-2xl text-foreground tracking-widest"
            />
            <Pressable
              onPress={verifyCode}
              disabled={busy || code.length < 6}
              className="rounded-2xl bg-primary px-5 py-4 mt-2 active:opacity-80 disabled:opacity-50"
            >
              {busy ? (
                <ActivityIndicator color="#FBF7F1" />
              ) : (
                <Text className="text-primary-foreground text-center font-semibold">
                  Verify
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setStage("email");
                setCode("");
                setError(null);
              }}
              className="py-2"
            >
              <Text className="text-center text-muted-foreground text-sm">
                Use a different email
              </Text>
            </Pressable>
          </View>
        )}

        {error ? (
          <View className="rounded-2xl bg-alert-red p-4">
            <Text className="text-warm-white text-sm">{error}</Text>
          </View>
        ) : null}

        <Text className="text-xs text-muted-foreground text-center mt-2">
          New here? Sign up on foracle.app first, then come back.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
