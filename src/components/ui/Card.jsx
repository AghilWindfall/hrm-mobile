import { StyleSheet, View } from "react-native"

export default function Card({ children }) {
  return <View style={styles.card}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 20,
    gap: 14,
    shadowColor: "#001F3F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
})
