import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"

export default function AppHeaderBar({ currentUser, onLogout }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.textWrap}>
        <Text style={styles.company}>WINDFALL PRODUCTIONS</Text>
        <Text style={styles.user} numberOfLines={1}>
          Current User: {currentUser || "Employee"}
        </Text>
      </View>

      <Pressable
        onPress={onLogout}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={20} color="#fff" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  textWrap: {
    flex: 1,
  },
  company: {
    color: "#FFF1D7",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.6,
  },
  user: {
    color: "#fff",
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  pressed: {
    opacity: 0.75,
  },
})
