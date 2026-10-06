import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
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

import { SafeAreaView } from "react-native-safe-area-context"; 

import { getUserByPhone } from '@/db/database';
import { normalizePhoneNumber } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/theme';

const PIN_LENGTH = 4;

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export default function LoginScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const { login } = useAuth();

  const [savedPhone, setSavedPhone] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  const [enteringNewPhone, setEnteringNewPhone] =
    useState(false);

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  /*
   * =====================================================
   * LOAD SAVED PHONE
   * =====================================================
   */

  useEffect(() => {
    loadSavedPhone();
  }, []);

  const loadSavedPhone = async () => {
    try {
      const phone =
        await AsyncStorage.getItem('lastPhone');

      if (phone) {
        setSavedPhone(phone);
        setEnteringNewPhone(false);
      } else {
        setEnteringNewPhone(true);
      }
    } catch (error) {
      console.error(
        'Error loading saved phone:',
        error
      );

      setEnteringNewPhone(true);
    }
  };

  /*
   * =====================================================
   * ACTIVE PHONE
   * =====================================================
   */

  const activePhone = enteringNewPhone
    ? phoneInput.trim()
    : savedPhone;

  /*
   * =====================================================
   * FORMAT PHONE
   * =====================================================
   */

  const formatPhone = (phone) => {
    if (!phone) {
      return '';
    }

    const clean = phone.replace(/\D/g, '');

    if (clean.length === 11) {
      return `${clean.slice(0, 4)} ${clean.slice(
        4,
        7
      )} ${clean.slice(7)}`;
    }

    return phone;
  };

  /*
   * =====================================================
   * LOGIN
   * =====================================================
   */

  const submitLogin = async (fullPin) => {
    const normalizedPhone =
      normalizePhoneNumber(activePhone);

    if (!normalizedPhone) {
      Alert.alert(
        'Phone Number Required',
        'Please enter your phone number.'
      );

      setPin('');
      return;
    }

    if (!/^\d{4}$/.test(fullPin)) {
      setPin('');
      return;
    }

    try {
      setLoading(true);

      /*
       * GET USER FROM SQLITE
       */
      const user = await getUserByPhone(
        db,
        normalizedPhone
      );

      /*
       * VERIFY USER + PIN
       */
      if (
        !user ||
        user.pin_code !== fullPin
      ) {
        Alert.alert(
          'Login Failed',
          'Incorrect phone number or PIN.'
        );

        setPin('');
        return;
      }

      /*
       * SAVE LAST PHONE
       */
      await AsyncStorage.setItem(
        'lastPhone',
        normalizedPhone
      );

      /*
       * SAVE USER TO AUTH CONTEXT
       */
      await login({
        id: user.id,
        phoneNumber: user.phone_number,
        storeName: user.store_name,
      });

    } catch (error) {
      console.error(
        'Login error:',
        error
      );

      Alert.alert(
        'Login Error',
        'Something went wrong while logging in.'
      );

      setPin('');

    } finally {
      setLoading(false);
    }
  };

  /*
   * =====================================================
   * KEYPAD
   * =====================================================
   */

  const handleKeyPress = (key) => {
    if (loading) {
      return;
    }

    /*
     * DELETE
     */
    if (key === 'del') {
      setPin((current) =>
        current.slice(0, -1)
      );

      return;
    }

    /*
     * EMPTY KEY
     */
    if (!key) {
      return;
    }

    /*
     * MAX 4 DIGITS
     */
    if (pin.length >= PIN_LENGTH) {
      return;
    }

    const nextPin = pin + key;

    setPin(nextPin);

    /*
     * AUTO LOGIN AFTER 4 DIGITS
     */
    if (nextPin.length === PIN_LENGTH) {
      setTimeout(() => {
        submitLogin(nextPin);
      }, 150);
    }
  };

  /*
   * =====================================================
   * SWITCH ACCOUNT
   * =====================================================
   */

  const switchAccount = async () => {
    if (loading) {
      return;
    }

    try {
      await AsyncStorage.removeItem(
        'lastPhone'
      );
    } catch (error) {
      console.error(
        'Error clearing saved phone:',
        error
      );
    }

    setSavedPhone('');
    setPhoneInput('');
    setPin('');
    setEnteringNewPhone(true);
  };

  /*
   * =====================================================
   * CONTINUE WITH NEW PHONE
   * =====================================================
   */

  const continueWithPhone = async () => {
    const normalizedPhone =
      normalizePhoneNumber(phoneInput);

    if (!normalizedPhone) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid phone number.'
      );

      return;
    }

    setSavedPhone(normalizedPhone);
    setEnteringNewPhone(false);
    setPhoneInput('');
    setPin('');

    try {
      await AsyncStorage.setItem(
        'lastPhone',
        normalizedPhone
      );
    } catch (error) {
      console.error(
        'Error saving phone:',
        error
      );
    }
  };

  /*
   * =====================================================
   * SIGN UP
   * =====================================================
   */

  const goToSignup = () => {
    router.push('/signup');
  };

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <SafeAreaView style={styles.safeArea}>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* =================================================
              BRAND
          ================================================= */}

          <View style={styles.brandSection}>

            <View style={styles.logoGlow}>

              <View style={styles.logoBox}>

                <Image
                  source={require('../assets/icon.png')}
                  style={styles.logo}
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

          <View style={styles.header}>

            <Text style={styles.title}>
              Welcome back
            </Text>

            <Text style={styles.subtitle}>
              Sign in to your Track&Tally account
            </Text>

            <Text style={styles.description}>
              Keep your store organized and your
              {' '}
              business moving.
            </Text>

          </View>

          {/* =================================================
              LOGIN CARD
          ================================================= */}

          <View style={styles.loginCard}>

            {!enteringNewPhone ? (
              <>

                {/* ACCOUNT */}

                <Text style={styles.sectionLabel}>
                  ACCOUNT
                </Text>

                <View
                  style={
                    styles.accountContainer
                  }
                >

                  <View
                    style={
                      styles.accountIcon
                    }
                  >

                    <Text
                      style={
                        styles.accountIconText
                      }
                    >
                      ✓
                    </Text>

                  </View>

                  <View
                    style={
                      styles.accountInfo
                    }
                  >

                    <Text
                      style={
                        styles.accountLabel
                      }
                    >
                      Phone Number
                    </Text>

                    <Text
                      style={
                        styles.accountPhone
                      }
                    >
                      {formatPhone(
                        savedPhone
                      )}
                    </Text>

                  </View>

                  <TouchableOpacity
                    onPress={
                      switchAccount
                    }
                    disabled={loading}
                    activeOpacity={0.7}
                  >

                    <Text
                      style={
                        styles.switchText
                      }
                    >
                      SWITCH
                    </Text>

                  </TouchableOpacity>

                </View>

                {/* PIN */}

                <Text style={styles.pinSectionLabel}>
                    ENTER YOUR PIN
                </Text>

                <View
                  style={
                    styles.pinContainer
                  }
                >

                  {Array.from({
                    length: PIN_LENGTH,
                  }).map((_, index) => (

                    <View
                      key={index}
                      style={[
                        styles.pinDot,
                        index < pin.length &&
                          styles.pinDotFilled,
                      ]}
                    >

                      {index < pin.length && (
                        <View
                          style={
                            styles.pinInnerDot
                          }
                        />
                      )}

                    </View>

                  ))}

                </View>

                {/* KEYPAD */}

                <View
                  style={
                    styles.keypadContainer
                  }
                >

                  {KEYPAD.map(
                    (row, rowIndex) => (

                      <View
                        key={rowIndex}
                        style={
                          styles.keypadRow
                        }
                      >

                        {row.map(
                          (key, keyIndex) => {

                            if (key === '') {
                              return (
                                <View
                                  key={
                                    keyIndex
                                  }
                                  style={
                                    styles.keyButtonPlaceholder
                                  }
                                />
                              );
                            }

                            return (
                              <TouchableOpacity
                                key={
                                  keyIndex
                                }
                                style={[
                                  styles.keyButton,
                                  key ===
                                    'del' &&
                                    styles.deleteButton,
                                ]}
                                onPress={() =>
                                  handleKeyPress(
                                    key
                                  )
                                }
                                disabled={
                                  loading
                                }
                                activeOpacity={
                                  0.7
                                }
                              >

                                <Text
                                  style={[
                                    styles.keyText,
                                    key ===
                                      'del' &&
                                      styles.deleteText,
                                  ]}
                                >
                                  {key ===
                                  'del'
                                    ? '⌫'
                                    : key}
                                </Text>

                              </TouchableOpacity>
                            );
                          }
                        )}

                      </View>

                    )
                  )}

                </View>

                {loading && (
                  <ActivityIndicator
                    size="small"
                    color={colors.gold}
                    style={
                      styles.loader
                    }
                  />
                )}

                

              </>
            ) : (

              /* =================================================
                 NEW PHONE
              ================================================= */

              <>

                <Text style={styles.sectionLabel}>
                  PHONE NUMBER
                </Text>

                <View
                  style={
                    styles.inputContainer
                  }
                >

                  <View
                    style={
                      styles.inputPrefix
                    }
                  >

                    <Text
                      style={
                        styles.inputPrefixText
                      }
                    >
                      PH
                    </Text>

                  </View>

                  <TextInput
                    value={phoneInput}
                    onChangeText={(value) =>
                      setPhoneInput(
                        value
                          .replace(
                            /\D/g,
                            ''
                          )
                          .slice(
                            0,
                            15
                          )
                      )
                    }
                    placeholder="09123456789"
                    placeholderTextColor="#9B9B9B"
                    style={
                      styles.input
                    }
                    keyboardType="phone-pad"
                    maxLength={15}
                    editable={!loading}
                    autoFocus
                  />

                </View>

                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    loading &&
                      styles.disabledButton,
                  ]}
                  onPress={
                    continueWithPhone
                  }
                  disabled={loading}
                  activeOpacity={0.85}
                >

                  <Text
                    style={
                      styles.continueButtonText
                    }
                  >
                    CONTINUE
                  </Text>

                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.backButton
                  }
                  onPress={() => {
                    setPhoneInput('');
                    setEnteringNewPhone(
                      false
                    );
                  }}
                  disabled={loading}
                  activeOpacity={0.7}
                >

                  <Text
                    style={
                      styles.backButtonText
                    }
                  >
                    BACK
                  </Text>

                </TouchableOpacity>

              </>
            )}

          </View>

          {/* =================================================
              SIGN UP
          ================================================= */}

          <View
            style={
              styles.bottomContainer
            }
          >

            <Text
              style={
                styles.bottomText
              }
            >
              Don't have an account?
            </Text>

            <TouchableOpacity
              onPress={goToSignup}
              disabled={loading}
              activeOpacity={0.7}
            >

              <Text
                style={
                  styles.signupLink
                }
              >
                SIGN UP
              </Text>

            </TouchableOpacity>

          </View>

          {/* FOOTER */}

          <Text style={styles.footer}>
            Track&Tally • Simple Store Management
          </Text>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

/*
 * =====================================================
 * STYLES
 * =====================================================
 */

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

  /* BRAND */

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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.10,
    shadowRadius: 8,

    elevation: 3,
  },

  logo: {
    width: 77,
    height: 77,
    borderRadius: 20,
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

  /* LOGIN CARD */

  loginCard: {
    backgroundColor: colors.white,
    borderRadius: 23,
    padding: 21,

    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.08,
    shadowRadius: 15,

    elevation: 4,
  },

  sectionLabel: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  pinSectionLabel: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
    alignSelf: 'center',
  },

  /* ACCOUNT */

  accountContainer: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: colors.cream,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 14,

    padding: 12,

    marginBottom: 24,
  },

  accountIcon: {
    width: 39,
    height: 39,
    borderRadius: 20,

    backgroundColor: colors.navy,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  accountIconText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '900',
  },

  accountInfo: {
    flex: 1,
  },

  accountLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },

  accountPhone: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '800',
  },

  switchText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  /* PIN */

  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    marginBottom: 20,

    gap: 13,
  },

  pinDot: {
    width: 15,
    height: 15,
    borderRadius: 8,

    borderWidth: 1.5,
    borderColor: colors.border,

    alignItems: 'center',
    justifyContent: 'center',
  },

  pinDotFilled: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },

  pinInnerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.white,
  },

  /* KEYPAD */

  keypadContainer: {
    alignItems: 'center',
  },

  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 11,
  },

  keyButton: {
    width: 63,
    height: 57,
    borderRadius: 29,

    backgroundColor: colors.white,

    borderWidth: 1,
    borderColor: colors.border,

    alignItems: 'center',
    justifyContent: 'center',

    marginHorizontal: 7,

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,

    elevation: 2,
  },

  keyButtonPlaceholder: {
    width: 63,
    height: 57,
    marginHorizontal: 7,
  },

  keyText: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '700',
  },

  deleteButton: {
    backgroundColor: colors.cream,
  },

  deleteText: {
    color: colors.textMuted,
    fontSize: 22,
  },

  loader: {
    marginTop: 8,
  },

  forgotButton: {
    alignItems: 'center',
    marginTop: 14,
  },

  forgotText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '700',
  },

  /* NEW PHONE */

  inputContainer: {
    height: 52,
    flexDirection: 'row',

    backgroundColor: colors.white,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 13,

    marginBottom: 15,

    overflow: 'hidden',
  },

  inputPrefix: {
    width: 48,
    backgroundColor: colors.cream,

    alignItems: 'center',
    justifyContent: 'center',

    borderRightWidth: 1,
    borderRightColor: colors.border,
  },

  inputPrefixText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
  },

  input: {
    flex: 1,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },

  continueButton: {
    height: 54,
    backgroundColor: colors.gold,
    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 3,

    shadowColor: colors.gold,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 7,

    elevation: 3,
  },

  disabledButton: {
    opacity: 0.6,
  },

  continueButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  backButton: {
    alignItems: 'center',
    marginTop: 15,
  },

  backButtonText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '800',
  },

  /* BOTTOM */

  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    marginTop: 22,
  },

  bottomText: {
    color: colors.textMuted,
    fontSize: 13,
  },

  signupLink: {
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
});