import { router } from "expo-router";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* LOGO */}
        <View style={styles.logoBox}>
          <Image
            source={require("../assets/icon.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Welcome to Track&Tally
          </Text>

          <Text style={styles.subtitle}>
            Manage your store, products, sales and debtors
            all in one place.
          </Text>
        </View>

        {/* BUTTONS */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>
              LOG IN
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push("/signup")}
            activeOpacity={0.85}
          >
            <Text style={styles.signupButtonText}>
              SIGN UP
            </Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          Track&Tally • Simple Store Management
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F4EA",
  },

  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
  },

  logoBox: {
    alignItems: "center",
    marginBottom: 28,
  },

  logoImage: {
    width: 180,
    height: 180,
    borderRadius: 30,
  },

  header: {
    alignItems: "center",
    marginBottom: 32,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E3A5F",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 15,
  },

  buttonContainer: {
    width: "100%",
  },

  loginButton: {
    height: 54,
    backgroundColor: "#1E3A5F",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
    shadowColor: "#1E3A5F",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1,
  },

  signupButton: {
    height: 54,
    backgroundColor: "#C9A24B",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C9A24B",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },

  signupButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1,
  },

  footer: {
    color: "#A2A2A2",
    fontSize: 10,
    textAlign: "center",
    marginTop: 25,
  },
});