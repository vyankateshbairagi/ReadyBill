import { Link } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ReadyBill</Text>

      <Text style={styles.subtitle}>
        Smart Billing Solution
      </Text>

      <TextInput
        placeholder="Mobile Number"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <Link href="/auth/signup" style={styles.link}>
        Create Account
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  logo: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },

  subtitle: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 40,
  },

  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },

  button: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
  },

  buttonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "600",
  },

  link: {
    marginTop: 20,
    textAlign: "center",
    color: "#2563EB",
  },
});