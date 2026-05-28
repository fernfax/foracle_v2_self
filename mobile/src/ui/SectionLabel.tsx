import { Text, type TextProps } from "react-native";

// Eyebrow / section label. Space Grotesk, 11px, 600 weight, uppercase,
// 0.14em letter-spacing. Color: muted-foreground.

export function SectionLabel({ className, style, children, ...rest }: TextProps) {
  return (
    <Text
      {...rest}
      className={`font-display text-[11px] text-foreground/55 ${className ?? ""}`}
      style={[{ letterSpacing: 1.5, textTransform: "uppercase" }, style]}
    >
      {children}
    </Text>
  );
}
