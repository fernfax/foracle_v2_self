import { Platform, View, type ViewProps, type ViewStyle } from "react-native";

// "Soft elevated paper" card. Layered iOS shadow (diffused, no harsh edges),
// 24-28px radius, warm hairline border, optional inset top highlight.
//
// Design system: design_guide.md §10.4 → "soft tactile paper layers,
// editorial minimalism, subtle dimensionality".

type CardProps = ViewProps & {
  padding?: "sm" | "md" | "lg";
  variant?:
    | "surface"
    | "muted"
    | "tint-success"
    | "tint-warning"
    | "tint-danger"
    | "tint-brand";
  /** Disable the lift effect — useful for nested cards or content-only containers. */
  flat?: boolean;
};

const paddingClass = {
  sm: "p-4",
  md: "p-5",
  lg: "p-7",
};

const variantBg: Record<NonNullable<CardProps["variant"]>, string> = {
  surface: "#FFFFFF",
  muted: "#F0EBE0",
  "tint-success": "rgba(0, 196, 170, 0.10)",
  "tint-warning": "rgba(212, 168, 67, 0.14)",
  "tint-danger": "rgba(224, 85, 85, 0.10)",
  "tint-brand": "rgba(184, 98, 42, 0.10)",
};

const variantBorder: Record<NonNullable<CardProps["variant"]>, string> = {
  surface: "rgba(28, 43, 42, 0.06)",
  muted: "rgba(28, 43, 42, 0.08)",
  "tint-success": "rgba(0, 196, 170, 0.18)",
  "tint-warning": "rgba(212, 168, 67, 0.22)",
  "tint-danger": "rgba(224, 85, 85, 0.18)",
  "tint-brand": "rgba(184, 98, 42, 0.18)",
};

// Layered iOS shadow — diffuse, warm-tinted toward the deep-forest brand
// shadow color so it never reads as cold gray.
const liftedShadow: ViewStyle =
  Platform.OS === "ios"
    ? {
        shadowColor: "#1C2B2A",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.16,
        shadowRadius: 28,
      }
    : { elevation: 6 };

export function Card({
  padding = "md",
  variant = "surface",
  flat = false,
  className,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: variantBg[variant],
          borderRadius: 24,
          borderWidth: 1,
          borderColor: variantBorder[variant],
        },
        flat ? undefined : liftedShadow,
        style,
      ]}
      className={`${paddingClass[padding]} ${className ?? ""}`}
    >
      {/* Inset top highlight — gives the lifted paper edge feel. Surface
          only; tinted variants don't need it (they already have a unified
          fill). */}
      {variant === "surface" && !flat ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 12,
            right: 12,
            height: 1,
            backgroundColor: "rgba(255, 255, 255, 0.6)",
          }}
        />
      ) : null}
      {children}
    </View>
  );
}
