import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext({
  user: null,
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

const AUTH_KEY = "@store_user_session";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore active user session on boot
  useEffect(() => {
    async function loadStoredUser() {
      try {
        const storedUser = await AsyncStorage.getItem(AUTH_KEY);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.phoneNumber) {
            setUser(parsedUser);
          } else {
            await AsyncStorage.removeItem(AUTH_KEY);
          }
        }
      } catch (e) {
        console.error("Failed to load auth state", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredUser();
  }, []);

  async function login(userData) {
    setUser(userData);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userData));
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
