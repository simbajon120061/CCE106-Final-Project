import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSQLiteContext } from 'expo-sqlite';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  createUser,
  getUserByPhone,
} from '@/db/database';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function SignupScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { signup } = useAuth();

  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  function showModal(type, title, message) {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
  }

  async function handleSignup() {
    setError('');

    if (
      !storeName.trim() ||
      !ownerName.trim() ||
      !phone.trim() ||
      !pin.trim() ||
      !confirmPin.trim()
    ) {
      setError('Please fill in all fields.');
      return;
    }

    if (!/^\d{4}$/.test(pin.trim())) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    if (pin.trim() !== confirmPin.trim()) {
      setError('PINs do not match.');
      return;
    }

    const cleanedPhone = phone.replace(/\D/g, '');

    if (cleanedPhone.length < 7 || cleanedPhone.length > 15) {
      setError('Please enter a valid phone number.');
      return;
    }

    try {
      setLoading(true);

      /* CHECK IF PHONE NUMBER ALREADY EXISTS */
      const existingUser = await getUserByPhone(db, cleanedPhone);

      if (existingUser) {
        try {
          await AsyncStorage.setItem('lastPhone', cleanedPhone);
        } catch (storageError) {
          console.warn(
            'Could not save registered phone locally',
            storageError
          );
        }

        setLoading(false);
        router.replace('/login');
        return;
      }

      /* CREATE USER USING SQLITE DATABASE */
      const userId = await createUser(db, {
        phoneNumber: cleanedPhone,
        pin: pin.trim(),
        storeName: storeName.trim(),
      });

      /* SAVE OWNER NAME AND STORE INFO LOCALLY */
      try {
        await AsyncStorage.setItem('ownerName', ownerName.trim());
        await AsyncStorage.setItem('storeName', storeName.trim());
        await AsyncStorage.setItem('lastPhone', cleanedPhone);
      } catch (storageError) {
        console.warn(
          'Could not save owner/store name locally',
          storageError
        );
      }

      setLoading(false);

      /* UPDATE AUTH CONTEXT */
      await signup({
        id: userId,
        phoneNumber: cleanedPhone,
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
      });

      /* GO TO LOGIN */
      router.replace('/login');

    } catch (err) {
      console.error('Signup error:', err);

      setLoading(false);

      const message = err?.message?.toLowerCase?.() || '';

      if (message.includes('unique') || message.includes('constraint')) {
        setError(
          'This phone number is already registered. Please log in instead.'
        );
      } else if (message.includes('database')) {
        setError('Database error. Please try again.');
      } else {
        setError(err?.message || 'Signup failed. Please try again.');
      }
    }
  }

  function handlePinChange(value, setter) {
    setter(value.replace(/\D/g, '').slice(0, 4));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* BRAND */}
          <View style={styles.brandSection}>
            <View style={styles.logoGlow}>
              <View style={styles.logoBox}>
                <Ionicons
                  name="storefront"
                  size={60}
                  color={colors.navy}
                />
              </View>
            </View>

            <Text style={styles.brandText}>TRACK&TALLY</Text>
            <Text style={styles.brandTagline}>SIMPLE STORE MANAGEMENT</Text>
          </View>

          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Set up your store</Text>
            <Text style={styles.description}>
              Join Track&Tally to manage your store and track customer credits
              effortlessly.
            </Text>
          </View>

          {/* SIGNUP CARD */}
          <View style={styles.signupCard}>
            {/* STORE NAME */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Store Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your store name"
                placeholderTextColor="#AAA79E"
                value={storeName}
                onChangeText={setStoreName}
                editable={!loading}
              />
            </View>

            {/* OWNER NAME */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Owner Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#AAA79E"
                value={ownerName}
                onChangeText={setOwnerName}
                editable={!loading}
              />
            </View>

            {/* PHONE */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>PH</Text>
                </View>

                <TextInput
                  style={styles.phoneInput}
                  placeholder="09XXXXXXXXX"
                  placeholderTextColor="#AAA79E"
                  value={phone}
                  onChangeText={(value) =>
                    setPhone(
                      value
                        .replace(/\D/g, '')
                        .slice(0, 11)
                    )
                  }
                  keyboardType="phone-pad"
                  editable={!loading}
                  maxLength={11}
                />
              </View>
            </View>

            {/* PIN SECTION */}
            <View style={styles.securityHeader}>
              <View style={styles.securityIcon}>
                <Text style={styles.securityIconText}>•</Text>
              </View>
              <View>
                <Text style={styles.securityTitle}>SECURITY PIN</Text>
                <Text style={styles.securitySubtitle}>Create a 4-digit PIN</Text>
              </View>
            </View>

            {/* PIN */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>4-digit PIN</Text>
              <View style={styles.pinInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.pinInput,
                    styles.pinInputWithEye,
                  ]}
                  placeholder="••••"
                  placeholderTextColor="#AAA79E"
                  value={pin}
                  onChangeText={(value) =>
                    handlePinChange(value, setPin)
                  }
                  keyboardType="number-pad"
                  secureTextEntry={!showPin}
                  maxLength={4}
                  editable={!loading}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPin(!showPin)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPin ? 'eye-off-outline' : 'eye-outline'}
                    size={21}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.helperText}>
                Use a PIN that you can easily remember.
              </Text>
            </View>

            {/* CONFIRM PIN */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Confirm PIN</Text>
              <View style={styles.pinInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.pinInput,
                    styles.pinInputWithEye,
                  ]}
                  placeholder="••••"
                  placeholderTextColor="#AAA79E"
                  value={confirmPin}
                  onChangeText={(value) =>
                    handlePinChange(value, setConfirmPin)
                  }
                  keyboardType="number-pad"
                  secureTextEntry={!showConfirmPin}
                  maxLength={4}
                  editable={!loading}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPin(!showConfirmPin)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirmPin ? 'eye-off-outline' : 'eye-outline'}
                    size={21}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* ERROR */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={colors.danger}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* SIGNUP BUTTON */}
            <TouchableOpacity
              style={[styles.signupButton, loading && styles.disabledButton]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Text style={styles.signupButtonText}>CREATE ACCOUNT</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={colors.white}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* LOGIN LINK */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => router.replace('/login')}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>LOG IN</Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <Text style={styles.footer}>
            Track&Tally • Simple Store Management
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* SUCCESS/ERROR MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalTopAccent,
                modalType === 'success' && styles.modalTopAccentSuccess,
                modalType === 'error' && styles.modalTopAccentError,
              ]}
            />

            <View
              style={[
                styles.modalIconOuter,
                modalType === 'success' && styles.modalSuccessOuter,
                modalType === 'error' && styles.modalErrorOuter,
              ]}
            >
              <View
                style={[
                  styles.modalIconInner,
                  modalType === 'success' && styles.modalSuccessInner,
                  modalType === 'error' && styles.modalErrorInner,
                ]}
              >
                <Ionicons
                  name={modalType === 'success' ? 'checkmark' : 'close'}
                  size={30}
                  color={
                    modalType === 'success' ? colors.success : colors.danger
                  }
                />
              </View>
            </View>

            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                modalType === 'success' && styles.modalButtonSuccess,
                modalType === 'error' && styles.modalButtonError,
                pressed && styles.modalButtonPressed,
              ]}
              onPress={closeModal}
            >
              <Text style={styles.modalButtonText}>
                {modalType === 'success' ? 'DONE' : 'CLOSE'}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.white}
              />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  keyboard: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 30,
  },

  brandSection: {
    alignItems: 'center',
    marginBottom: 16,
  },

  logoGlow: {
    width: 104,
    height: 104,
    borderRadius: 30,
    backgroundColor: '#EEE9DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 25,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  brandText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.5,
    color: colors.navy,
  },

  brandTagline: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.gold,
    marginTop: 3,
  },

  header: {
    alignItems: 'center',
    marginBottom: 21,
  },

  title: {
    color: colors.navy,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 6,
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
  },

  description: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },

  signupCard: {
    backgroundColor: colors.white,
    borderRadius: 23,
    padding: 21,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },

  fieldContainer: {
    marginBottom: 15,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 7,
  },

  input: {
    height: 51,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },

  phoneInputContainer: {
    height: 51,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    overflow: 'hidden',
  },

  phonePrefix: {
    width: 48,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },

  phonePrefixText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
  },

  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
  },

  pinInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },

  pinInput: {
    flex: 1,
    fontSize: 19,
    letterSpacing: 6,
    color: colors.navy,
    fontWeight: '700',
  },

  pinInputWithEye: {
    paddingRight: 0,
  },

  eyeButton: {
    width: 44,
    height: 51,
    alignItems: 'center',
    justifyContent: 'center',
  },

  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 5,
  },

  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },

  securityIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F1E7C8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  securityIconText: {
    color: colors.gold,
    fontSize: 18,
  },

  securityTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: 0.8,
  },

  securitySubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F1D2D2',
    borderRadius: 12,
    padding: 11,
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
  },

  signupButton: {
    height: 54,
    backgroundColor: colors.gold,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 3,
  },

  signupButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },

  loginText: {
    color: colors.textMuted,
    fontSize: 13,
  },

  loginLink: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 5,
  },

  footer: {
    textAlign: 'center',
    color: '#A2A2A2',
    fontSize: 10,
    marginTop: 21,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,42,69,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  modalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 26,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 18,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 12,
  },

  modalTopAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.gold,
  },

  modalTopAccentSuccess: {
    backgroundColor: colors.success,
  },

  modalTopAccentError: {
    backgroundColor: colors.danger,
  },

  modalIconOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  modalSuccessOuter: {
    backgroundColor: '#EAF6EF',
  },

  modalErrorOuter: {
    backgroundColor: '#FDEEEE',
  },

  modalIconInner: {
    width: 61,
    height: 61,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSuccessInner: {
    backgroundColor: '#D9F0E2',
  },

  modalErrorInner: {
    backgroundColor: '#F8DADA',
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },

  modalMessage: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },

  modalButton: {
    width: '100%',
    height: 51,
    borderRadius: 14,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  modalButtonSuccess: {
    backgroundColor: colors.success,
  },

  modalButtonError: {
    backgroundColor: colors.danger,
  },

  modalButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  modalButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
