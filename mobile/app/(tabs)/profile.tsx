import { useClerk, useUser } from "@clerk/clerk-expo";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/src/lib/api-client";
import { BackgroundDecorPicker } from "@/src/ui/BackgroundDecorPicker";
import { Card } from "@/src/ui/Card";
import { MotifStrip } from "@/src/ui/MotifStrip";
import { SectionLabel } from "@/src/ui/SectionLabel";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useClerk();

  const primaryEmail = user?.emailAddresses[0]?.emailAddress ?? "—";
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || primaryEmail;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <MotifStrip variant="thick" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: 32,
          paddingHorizontal: 20,
          gap: 20,
        }}
      >
        <View className="gap-2">
          <SectionLabel>Signed in as</SectionLabel>
          <Text
            className="font-display text-foreground"
            style={{ fontSize: 28, letterSpacing: -0.4 }}
          >
            {displayName}
          </Text>
          <Text className="font-body text-foreground/55 text-sm">
            {primaryEmail}
          </Text>
        </View>

        <Card padding="md" className="gap-2">
          <SectionLabel>Talking to</SectionLabel>
          <Text className="font-body text-foreground text-sm">{API_BASE_URL}</Text>
        </Card>

        <Card padding="md" className="gap-2">
          <SectionLabel>About</SectionLabel>
          <Text className="font-editorial text-foreground/70 text-base leading-6">
            Foracle for iOS — Phase C bootstrap. More screens coming in Phase D.
          </Text>
        </Card>

        <BackgroundDecorPicker />

        <Pressable
          onPress={() => signOut()}
          className="rounded-[10px] bg-deep-forest px-5 py-4 mt-2 active:opacity-80"
        >
          <Text className="font-display text-warm-white text-center text-base">
            Sign out
          </Text>
        </Pressable>

        <Text className="font-display text-[11px] text-foreground/40 text-center mt-2" style={{ letterSpacing: 1.5 }}>
          V1 · MOBILE BOOTSTRAP
        </Text>
      </ScrollView>
    </View>
  );
}
