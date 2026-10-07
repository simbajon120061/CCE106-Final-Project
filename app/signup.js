import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';


import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSQLiteContext } from 'expo-sqlite';

import {
  createUser,
  getUserByPhone,
} from '@/db/database';

import { colors } from '@/constants/theme';

export default function SignupScreen() {
  const db = useSQLiteContext();

  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /*
   * =====================================================
   * SIGNUP
   * =====================================================
   */

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

    if (
      cleanedPhone.length < 7 ||
      cleanedPhone.length > 15
    ) {
      setError('Please enter a valid phone number.');
      return;
    }

    try {
      setLoading(true);

      /*
       * CHECK IF PHONE NUMBER ALREADY EXISTS
       */
      const existingUser = await getUserByPhone(
        db,
        cleanedPhone
      );

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

      /*
       * CREATE USER USING YOUR EXISTING SQLITE DATABASE
       *
       * Your database function accepts:
       * phoneNumber
       * pin
       * storeName
       */
      await createUser(db, {
        phoneNumber: cleanedPhone,
        pin: pin.trim(),
        storeName: storeName.trim(),
      });

      /*
       * OWNER NAME
       *
       * Your current users table does not have an
       * owner_name column, so keep this locally.
       */
      try {
        await AsyncStorage.setItem(
          'ownerName',
          ownerName.trim()
        );

        await AsyncStorage.setItem(
          'storeName',
          storeName.trim()
        );

        await AsyncStorage.setItem(
          'lastPhone',
          cleanedPhone
        );
      } catch (storageError) {
        console.warn(
          'Could not save owner/store name locally',
          storageError
        );
      }

      setLoading(false);

      /*
       * GO TO LOGIN
       */
      router.replace('/login');

    } catch (err) {
      console.error('Signup error:', err);

      setLoading(false);

      const message =
        err?.message?.toLowerCase?.() || '';

      if (
        message.includes('unique') ||
        message.includes('constraint')
      ) {
        setError(
          'This phone number is already registered.'
        );
        return;
      }

      setError(
        err?.message ||
        'Something went wrong. Please try again.'
      );
    }
  }

  /*
   * =====================================================
   * PIN INPUT
   * =====================================================
   */

  function handlePinChange(value, setter) {
    setter(
      value
        .replace(/[^0-9]/g, '')
        .slice(0, 4)
    );
  }

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      keyboardVerticalOffset={
        Platform.OS === 'ios'
          ? 0
          : 20
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >

        {/* =================================================
            TOP BRAND
        ================================================= */}

        <View style={styles.brandSection}>

          <View style={styles.logoGlow}>

            <View style={styles.logoBox}>

              <Image
                source={require('../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />

            </View>

          </View>

          <Text style={styles.brandText}>
            TRACK&TALLY
          </Text>

          <Text style={styles.brandTagline}>
            SIMPLE STORE MANAGEMENT
          </Text>

        </View>

        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.headerSection}>

          <Text style={styles.title}>
            Create your store
          </Text>

          <Text style={styles.subtitle}>
            Set up your account and start
            {'\n'}
            managing your store with ease.
          </Text>

        </View>

        {/* =================================================
            FORM CARD
        ================================================= */}

        <View style={styles.formCard}>

          {/* CARD HEADER */}

          <View style={styles.cardHeader}>

            <View style={styles.cardHeaderLine} />

            <View>

              <Text style={styles.cardTitle}>
                STORE INFORMATION
              </Text>

              <Text style={styles.cardSubtitle}>
                Enter your account details below
              </Text>

            </View>

          </View>

          {/* =================================================
              STORE NAME
          ================================================= */}

          <View style={styles.fieldContainer}>

            <Text style={styles.label}>
              Store name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Aling Nena's Store"
              placeholderTextColor="#AAA79E"
              value={storeName}
              onChangeText={setStoreName}
              autoCapitalize="words"
              editable={!loading}
            />

          </View>

          {/* =================================================
              OWNER NAME
          ================================================= */}

          <View style={styles.fieldContainer}>

            <Text style={styles.label}>
              Owner name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Juan Dela Cruz"
              placeholderTextColor="#AAA79E"
              value={ownerName}
              onChangeText={setOwnerName}
              autoCapitalize="words"
              editable={!loading}
            />

          </View>

          {/* =================================================
              PHONE
          ================================================= */}

          <View style={styles.fieldContainer}>

            <Text style={styles.label}>
              Phone number
            </Text>

            <View style={styles.phoneInputContainer}>

              <View style={styles.phonePrefix}>

                <Text style={styles.phonePrefixText}>
                  PH
                </Text>

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
                      .slice(0, 15)
                  )
                }
                keyboardType="phone-pad"
                editable={!loading}
                maxLength={15}
              />

            </View>

          </View>

          {/* =================================================
              SECURITY HEADER
          ================================================= */}

          <View style={styles.securityHeader}>

            <View style={styles.securityIcon}>

              <Text style={styles.securityIconText}>
                •
              </Text>

            </View>

            <View>

              <Text style={styles.securityTitle}>
                SECURITY PIN
              </Text>

              <Text style={styles.securitySubtitle}>
                Create a 4-digit PIN
              </Text>

            </View>

          </View>

          {/* =================================================
              PIN
          ================================================= */}

          <View style={styles.fieldContainer}>

            <Text style={styles.label}>
              4-digit PIN
            </Text>

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

          {/* =================================================
              CONFIRM PIN
          ================================================= */}

          <View style={styles.fieldContainer}>

            <Text style={styles.label}>
              Confirm PIN
            </Text>

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
                onPress={() =>
                  setShowConfirmPin(!showConfirmPin)
                }
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    showConfirmPin
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={21}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

          </View>

          {/* =================================================
              ERROR
          ================================================= */}

          {error ? (
            <View style={styles.errorBox}>

              <View style={styles.errorIcon}>

                <Text style={styles.errorIconText}>
                  !
                </Text>

              </View>

              <Text style={styles.errorText}>
                {error}
              </Text>

            </View>
          ) : null}

          {/* =================================================
              SIGN UP BUTTON
          ================================================= */}

          <TouchableOpacity
            style={[
              styles.signupButton,
              loading &&
                styles.disabledButton,
            ]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >

            <View style={styles.buttonInner}>

              <Text style={styles.signupText}>
                {loading
                  ? 'CREATING ACCOUNT...'
                  : 'CREATE ACCOUNT'}
              </Text>

              {!loading && (
                <Text style={styles.arrow}>
                  →
                </Text>
              )}

            </View>

          </TouchableOpacity>

        </View>

        {/* =================================================
            LOGIN
        ================================================= */}

        <View style={styles.loginSection}>

          <Text style={styles.loginQuestion}>
            Already have an account?
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.push('/login')
            }
            disabled={loading}
            activeOpacity={0.7}
          >

            <Text style={styles.loginLink}>
              LOG IN
            </Text>

          </TouchableOpacity>

        </View>

        {/* =================================================
            FOOTER
        ================================================= */}

        <Text style={styles.footer}>
          Track&Tally • Simple Store Management
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/*
 * =====================================================
 * STYLES
 * =====================================================
 */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 30,
  },

  /* BRAND */

  brandSection: {
    alignItems: 'center',
    marginBottom: 18,
  },

  logoGlow: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: '#EEE9DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  logoBox: {
    width: 94,
    height: 94,
    borderRadius: 27,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.10,
    shadowRadius: 10,

    elevation: 3,
  },

  logoImage: {
    width: 82,
    height: 82,
    borderRadius: 22,
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

  /* HEADER */

  headerSection: {
    alignItems: 'center',
    marginBottom: 22,
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: colors.navy,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 7,
    paddingHorizontal: 20,
  },

  /* FORM CARD */

  formCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 22,

    borderWidth: 1,
    borderColor: '#E9E6DD',

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,

    elevation: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  cardHeaderLine: {
    width: 4,
    height: 36,
    borderRadius: 4,
    backgroundColor: colors.gold,
    marginRight: 11,
  },

  cardTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.navy,
  },

  cardSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* INPUTS */

  fieldContainer: {
    marginTop: 15,
  },

  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 7,
    letterSpacing: 0.2,
  },

  input: {
    height: 51,
    backgroundColor: '#FAFAF8',
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 14,
    color: colors.text,

    borderWidth: 1,
    borderColor: colors.border,
  },

  pinInput: {
    letterSpacing: 7,
    fontWeight: '800',
  },

  pinInputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },

  pinInputWithEye: {
    paddingRight: 50,
  },

  eyeButton: {
    position: 'absolute',
    right: 12,
    height: 51,
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  helperText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
  },

  /* PHONE */

  phoneInputContainer: {
    height: 51,
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#FAFAF8',

    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,

    overflow: 'hidden',
  },

  phonePrefix: {
    height: '100%',
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#F0EEE6',

    borderRightWidth: 1,
    borderRightColor: colors.border,
  },

  phonePrefixText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: 0.5,
  },

  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 13,
    fontSize: 14,
    color: colors.text,
  },

  /* SECURITY */

  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 1,
    paddingTop: 18,

    borderTopWidth: 1,
    borderTopColor: '#EEECE5',
  },

  securityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F4EAC7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  securityIconText: {
    color: colors.gold,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 26,
  },

  securityTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: 1,
  },

  securitySubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* ERROR */

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#FFF2F0',

    borderWidth: 1,
    borderColor: '#F2D2CD',

    borderRadius: 11,

    paddingHorizontal: 11,
    paddingVertical: 10,

    marginTop: 15,
  },

  errorIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  errorIconText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },

  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },

  /* BUTTON */

  signupButton: {
    height: 55,
    backgroundColor: colors.gold,
    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 22,

    shadowColor: colors.gold,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.20,
    shadowRadius: 9,

    elevation: 4,
  },

  disabledButton: {
    opacity: 0.60,
  },

  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signupText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  arrow: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '700',
    marginLeft: 10,
    marginTop: -2,
  },

  /* LOGIN */

  loginSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 21,
  },

  loginQuestion: {
    color: colors.textMuted,
    fontSize: 12,
  },

  loginLink: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
    letterSpacing: 0.5,
  },

  /* FOOTER */

  footer: {
    color: '#AAA79E',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.2,
  },
});
