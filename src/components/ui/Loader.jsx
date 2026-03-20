import { ActivityIndicator, StyleSheet, View } from "react-native"

export default function Loader() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color="#16324F" />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
})
