import { StyleSheet, Text, TextInput, View } from "react-native"

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType = "default",
  error,
  leftIcon,
  rightIcon,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          style={styles.input}
          placeholderTextColor="#8593A3"
        />
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 6,
  },
  label: {
    color: "#1A2E44",
    fontSize: 13,
    fontWeight: "600",
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: "#D3D9E0",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: "#C0353B",
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    color: "#122033",
    fontSize: 15,
    paddingVertical: 12,
  },
  errorText: {
    color: "#C0353B",
    fontSize: 12,
  },
})
