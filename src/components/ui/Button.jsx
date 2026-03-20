import { Pressable, StyleSheet, Text } from "react-native"

export default function Button({
  label,
  onPress,
  disabled,
  loading,
  loadingLabel = "Loading...",
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && !loading ? styles.pressed : null,
        disabled || loading ? styles.disabled : null,
      ]}
    >
      <Text style={styles.label}>{loading ? loadingLabel : label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#16324F",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
})
