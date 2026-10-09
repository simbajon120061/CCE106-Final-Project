import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/Button";
import Card from "@/components/Card";

import {
  colors,
  spacing,
  radius,
} from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";

import {
  updateUserProfile,
  updateUserPin,
  getUserByPhone,
} from "@/db/database";

import { normalizePhoneNumber } from "@/lib/auth";

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { user, login } = useAuth();

  const [storeName, setStoreName] = useState(
    user?.storeName || ""
  );

  const [ownerName, setOwnerName] = useState(
    user?.ownerName || ""
  );

  const [phoneNumber, setPhoneNumber] = useState(
    user?.phoneNumber || ""
  );

  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [savingPin, setSavingPin] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("success");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!user?.id) return undefined;

    db.getFirstAsync("SELECT owner_name FROM users WHERE id = ?", [user.id])
      .then((profile) => {
        if (active) setOwnerName(profile?.owner_name || "");
      })
      .catch((error) => {
        console.error("Could not load store owner name:", error);
      });

    return () => {
      active = false;
    };
  }, [db, user?.id]);

  function showModal(type, title, message) {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
  }

  /* =================================
     UPDATE PROFILE
  ================================= */

  async function handleUpdateProfile() {
    const normalizedPhone =
      normalizePhoneNumber(phoneNumber);

    if (!storeName.trim() || !normalizedPhone) {
      showModal(
        "warning",
        "Missing Information",
        "Store name and phone number cannot be empty."
      );
      return;
    }

    setSavingProfile(true);

    try {
      await updateUserProfile(db, {
        id: user.id,
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        phoneNumber: normalizedPhone,
      });

      await login({
        ...user,
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        phoneNumber: normalizedPhone,
      });

      showModal(
        "success",
        "Profile Updated",
        "Your store profile has been updated successfully."
      );
    } catch (_error) {
      showModal(
        "error",
        "Update Failed",
        "Could not update your profile. The phone number may already be in use."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  /* =================================
     CHANGE PIN
  ================================= */

  async function handleChangePin() {
    if (!currentPin || !newPin || !confirmPin) {
      showModal(
        "warning",
        "Missing Information",
        "Please complete all PIN fields before continuing."
      );
      return;
    }

    if (
      !/^\d{4}$/.test(currentPin) ||
      !/^\d{4}$/.test(newPin)
    ) {
      showModal(
        "warning",
        "Invalid PIN",
        "PIN codes must contain exactly 4 digits."
      );
      return;
    }

    if (newPin !== confirmPin) {
      showModal(
        "warning",
        "PIN Mismatch",
        "The new PIN and confirmation PIN do not match."
      );
      return;
    }

    if (currentPin === newPin) {
      showModal(
        "warning",
        "PIN Not Changed",
        "Your new PIN must be different from your current PIN."
      );
      return;
    }

    setSavingPin(true);

    try {
      const dbUser = await getUserByPhone(
        db,
        user.phoneNumber
      );

      if (!dbUser || dbUser.pin_code !== currentPin) {
        showModal(
          "error",
          "Authentication Failed",
          "The current PIN you entered is incorrect."
        );

        setSavingPin(false);
        return;
      }

      await updateUserPin(db, {
        id: user.id,
        newPin,
      });

      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");

      showModal(
        "success",
        "PIN Updated",
        "Your security PIN has been changed successfully."
      );
    } catch (_error) {
      showModal(
        "error",
        "Update Failed",
        "Could not update your PIN. Please try again."
      );
    } finally {
      setSavingPin(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        style={styles.keyboard}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.container}
        >

          {/* =================================
              PROFILE HERO
          ================================= */}

          <View style={styles.profileHero}>

            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <Pressable
              onPress={() => router.replace("/settings")}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={colors.white}
              />
            </Pressable>

            <View style={styles.avatarOuter}>
              <View style={styles.avatarCircle}>
                <Ionicons
                  name="storefront"
                  size={37}
                  color={colors.gold}
                />
              </View>
            </View>

            <Text style={styles.profileLabel}>
              STORE ACCOUNT
            </Text>

            <Text
              style={styles.headerTitle}
              numberOfLines={1}
            >
              {user?.storeName || "My Store"}
            </Text>

            <View style={styles.headerPhone}>
              <Ionicons
                name="call-outline"
                size={14}
                color={colors.goldLight}
              />

              <Text style={styles.headerSubtitle}>
                {user?.phoneNumber || "No phone number"}
              </Text>
            </View>

            <View style={styles.secureBadge}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={colors.success}
              />

              <Text style={styles.secureBadgeText}>
                Account Secured
              </Text>
            </View>
          </View>

          {/* =================================
              STORE DETAILS HEADER
          ================================= */}

          <View style={styles.sectionHeaderRow}>

            <View style={styles.sectionIcon}>
              <Ionicons
                name="storefront-outline"
                size={17}
                color={colors.gold}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Store Details
              </Text>

              <Text style={styles.sectionSubtitle}>
                Update your store information
              </Text>
            </View>

          </View>

          {/* =================================
              STORE DETAILS CARD
          ================================= */}

          <Card style={styles.formCard}>

            {/* STORE NAME */}

            <View style={styles.inputGroup}>

              <View style={styles.labelRow}>

                <View style={styles.labelIcon}>
                  <Ionicons
                    name="business-outline"
                    size={14}
                    color={colors.navy}
                  />
                </View>

                <Text style={styles.label}>
                  Store Name
                </Text>

              </View>

              <TextInput
                style={styles.input}
                value={storeName}
                onChangeText={setStoreName}
                placeholder="e.g. Aling Nena's Store"
                placeholderTextColor={colors.textMuted}
              />

            </View>

            {/* STORE OWNER */}

            <View style={styles.inputGroup}>

              <View style={styles.labelRow}>

                <View style={styles.labelIcon}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={colors.navy}
                  />
                </View>

                <Text style={styles.label}>
                  Store Owner
                </Text>

              </View>

              <TextInput
                style={styles.input}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Enter store owner's name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />

            </View>

            {/* PHONE */}

            <View style={styles.inputGroup}>

              <View style={styles.labelRow}>

                <View style={styles.labelIcon}>
                  <Ionicons
                    name="call-outline"
                    size={14}
                    color={colors.navy}
                  />
                </View>

                <Text style={styles.label}>
                  Phone Number
                </Text>

              </View>

              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={(value) =>
                  setPhoneNumber(
                    normalizePhoneNumber(value).slice(0, 11)
                  )
                }
                keyboardType="phone-pad"
                placeholder="09XXXXXXXXX"
                placeholderTextColor={colors.textMuted}
                maxLength={11}
              />

            </View>

            {/* SAVE BUTTON */}

            <View style={styles.buttonWrapper}>

              <Button
                title={
                  savingProfile
                    ? "Saving..."
                    : "Save Profile Details"
                }
                onPress={handleUpdateProfile}
                disabled={savingProfile}
              />

            </View>

          </Card>

          {/* =================================
              SECURITY HEADER
          ================================= */}

          <View style={styles.sectionHeaderRow}>

            <View style={styles.sectionIconSecurity}>
              <Ionicons
                name="shield-outline"
                size={17}
                color={colors.gold}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Security
              </Text>

              <Text style={styles.sectionSubtitle}>
                Manage your account PIN
              </Text>
            </View>

          </View>

          {/* =================================
              SECURITY CARD
          ================================= */}

          <Card style={styles.securityCard}>

            {/* SECURITY INTRO */}

            <View style={styles.securityIntro}>

              <View style={styles.securityIntroIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={21}
                  color={colors.navy}
                />
              </View>

              <View style={styles.securityIntroText}>

                <Text style={styles.securityIntroTitle}>
                  Change Security PIN
                </Text>

                <Text style={styles.securityIntroDescription}>
                  Use a 4-digit PIN to protect your
                  store account.
                </Text>

              </View>

              <View style={styles.securityMiniBadge}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={13}
                  color={colors.success}
                />
              </View>

            </View>

            <View style={styles.securityLine} />

            {/* CURRENT PIN */}

            <View style={styles.inputGroup}>

              <View style={styles.labelRow}>

                <View style={styles.labelIcon}>
                  <Ionicons
                    name="key-outline"
                    size={14}
                    color={colors.navy}
                  />
                </View>

                <Text style={styles.label}>
                  Current PIN
                </Text>

              </View>

              <PinInput
                value={currentPin}
                onChangeText={setCurrentPin}
              />

            </View>

            {/* NEW PIN */}

            <View style={styles.inputGroup}>

              <View style={styles.labelRow}>

                <View style={styles.labelIcon}>
                  <Ionicons
                    name="lock-open-outline"
                    size={14}
                    color={colors.navy}
                  />
                </View>

                <Text style={styles.label}>
                  New PIN
                </Text>

              </View>

              <PinInput
                value={newPin}
                onChangeText={setNewPin}
              />

            </View>

            {/* CONFIRM PIN */}

            <View style={styles.inputGroup}>

              <View style={styles.labelRow}>

                <View style={styles.labelIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={14}
                    color={colors.navy}
                  />
                </View>

                <Text style={styles.label}>
                  Confirm New PIN
                </Text>

              </View>

              <PinInput
                value={confirmPin}
                onChangeText={setConfirmPin}
              />

            </View>

            {/* UPDATE BUTTON */}

            <View style={styles.buttonWrapper}>

              <Button
                title={
                  savingPin
                    ? "Updating..."
                    : "Update PIN"
                }
                onPress={handleChangePin}
                disabled={savingPin}
              />

            </View>

          </Card>

          {/* =================================
              SECURITY NOTE
          ================================= */}

          <View style={styles.securityNote}>

            <View style={styles.noteIcon}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={colors.gold}
              />
            </View>

            <View style={styles.noteContent}>

              <Text style={styles.noteTitle}>
                Keep Your PIN Private
              </Text>

              <Text style={styles.noteText}>
                Never share your security PIN with
                anyone. Your PIN helps protect access
                to your store account.
              </Text>

            </View>

          </View>

          {/* =================================
              GOLD / NAVY FOOTER
          ================================= */}

          <View style={styles.footer}>

            <View style={styles.footerTopLine} />

            <View style={styles.footerBrandRow}>

              <View style={styles.footerIcon}>
                <Ionicons
                  name="storefront"
                  size={17}
                  color={colors.gold}
                />
              </View>

              <Text style={styles.footerBrand}>
                Track&Tally
              </Text>

            </View>

            <Text style={styles.footerText}>
              Simple Store Management
            </Text>

            <View style={styles.footerDivider} />

            <View style={styles.footerStatus}>

              <View style={styles.footerStatusDot} />

              <Text style={styles.footerVersion}>
                STORE PROFILE • SECURITY
              </Text>

            </View>

            <Text style={styles.footerCopyright}>
              Your store. Your records. Your control.
            </Text>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* =================================
          SUCCESS / ERROR / WARNING MODAL
      ================================= */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalCard}>

            {/* MODAL TOP ACCENT */}

            <View
              style={[
                styles.modalTopAccent,
                modalType === "success" &&
                  styles.modalTopAccentSuccess,
                modalType === "error" &&
                  styles.modalTopAccentError,
                modalType === "warning" &&
                  styles.modalTopAccentWarning,
              ]}
            />

            {/* MODAL ICON */}

            <View
              style={[
                styles.modalIconOuter,
                modalType === "success" &&
                  styles.modalSuccessOuter,
                modalType === "error" &&
                  styles.modalErrorOuter,
                modalType === "warning" &&
                  styles.modalWarningOuter,
              ]}
            >

              <View
                style={[
                  styles.modalIconInner,
                  modalType === "success" &&
                    styles.modalSuccessInner,
                  modalType === "error" &&
                    styles.modalErrorInner,
                  modalType === "warning" &&
                    styles.modalWarningInner,
                ]}
              >

                <Ionicons
                  name={
                    modalType === "success"
                      ? "checkmark"
                      : modalType === "error"
                      ? "close"
                      : "alert"
                  }
                  size={30}
                  color={
                    modalType === "success"
                      ? colors.success
                      : modalType === "error"
                      ? colors.danger
                      : colors.gold
                  }
                />

              </View>

            </View>

            {/* MODAL TITLE */}

            <Text style={styles.modalTitle}>
              {modalTitle}
            </Text>

            {/* MODAL MESSAGE */}

            <Text style={styles.modalMessage}>
              {modalMessage}
            </Text>

            {/* STATUS */}

            <View
              style={[
                styles.modalStatus,
                modalType === "success" &&
                  styles.modalStatusSuccess,
                modalType === "error" &&
                  styles.modalStatusError,
                modalType === "warning" &&
                  styles.modalStatusWarning,
              ]}
            >

              <Ionicons
                name={
                  modalType === "success"
                    ? "shield-checkmark-outline"
                    : modalType === "error"
                    ? "warning-outline"
                    : "information-circle-outline"
                }
                size={14}
                color={
                  modalType === "success"
                    ? colors.success
                    : modalType === "error"
                    ? colors.danger
                    : colors.gold
                }
              />

              <Text
                style={[
                  styles.modalStatusText,
                  modalType === "success" &&
                    styles.modalStatusTextSuccess,
                  modalType === "error" &&
                    styles.modalStatusTextError,
                  modalType === "warning" &&
                    styles.modalStatusTextWarning,
                ]}
              >
                {modalType === "success"
                  ? "Successfully completed"
                  : modalType === "error"
                  ? "Action could not be completed"
                  : "Please review your information"}
              </Text>

            </View>

            {/* MODAL BUTTON */}

            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                modalType === "success" &&
                  styles.modalButtonSuccess,
                modalType === "error" &&
                  styles.modalButtonError,
                modalType === "warning" &&
                  styles.modalButtonWarning,
                pressed && styles.modalButtonPressed,
              ]}
              onPress={closeModal}
            >

              <Text style={styles.modalButtonText}>
                {modalType === "success"
                  ? "DONE"
                  : "CLOSE"}
              </Text>

              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.white}
              />

            </Pressable>

            {/* CANCEL / CLOSE */}

            <Pressable
              style={({ pressed }) => [
                styles.modalCancelButton,
                pressed && styles.modalCancelPressed,
              ]}
              onPress={closeModal}
            >

              <Text style={styles.modalCancelText}>
                Cancel
              </Text>

            </Pressable>

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  );
}

/* =================================
   PIN INPUT
================================= */

function PinInput({ value, onChangeText }) {
  const [pinVisible, setPinVisible] = useState(false);

  return (
    <View style={styles.pinWrapper}>

      <View style={styles.pinIconBox}>
        <Ionicons
          name="keypad-outline"
          size={17}
          color={colors.gold}
        />
      </View>

      <TextInput
        style={styles.pinInput}
        secureTextEntry={!pinVisible}
        value={value}
        onChangeText={(nextValue) =>
          onChangeText(
            nextValue.replace(/\D/g, "")
          )
        }
        keyboardType="number-pad"
        maxLength={4}
        placeholder="••••"
        placeholderTextColor={colors.textMuted}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pinVisible ? "Hide PIN" : "Show PIN"}
        onPress={() => setPinVisible((visible) => !visible)}
        hitSlop={8}
        style={styles.pinVisibilityToggle}
      >
        <Ionicons
          name={pinVisible ? "eye-off-outline" : "eye-outline"}
          size={19}
          color={colors.textMuted}
        />
      </Pressable>

    </View>
  );
}

/* =================================
   STYLES
================================= */

const styles = StyleSheet.create({

  /* =========================
     MAIN
  ========================= */

  safe: {
    flex: 1,
    backgroundColor: colors.navy,
  },

  keyboard: {
    flex: 1,
  },

  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 40,
    backgroundColor: colors.cream,
    flexGrow: 1,
  },

  /* =========================
     PROFILE HERO
  ========================= */

  profileHero: {
    backgroundColor: colors.navy,
    borderRadius: 26,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 25,

    borderWidth: 1,
    borderColor: "rgba(201,162,75,0.35)",

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 9,
    },
    shadowOpacity: 0.24,
    shadowRadius: 15,
    elevation: 8,
  },

  heroGlowOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -95,
    top: -105,
    backgroundColor: colors.navyDark,
    opacity: 0.9,
  },

  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -70,
    bottom: -65,
    backgroundColor: "#24486E",
    opacity: 0.5,
  },

  backButton: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 1,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },

  avatarOuter: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "rgba(201,162,75,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(201,162,75,0.45)",
  },

  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.navyDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201,162,75,0.25)",
  },

  profileLabel: {
    marginTop: 15,
    fontSize: 10,
    fontWeight: "800",
    color: colors.goldLight,
    letterSpacing: 1.5,
  },

  headerTitle: {
    marginTop: 5,
    fontSize: 23,
    fontWeight: "800",
    color: colors.white,
    textAlign: "center",
  },

  headerPhone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#D8DFE8",
  },

  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: "rgba(46,125,91,0.18)",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.35)",
  },

  secureBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9BE0BC",
  },

  /* =========================
     SECTION
  ========================= */

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F1E7C8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E8D8A8",
  },

  sectionIconSecurity: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F1E7C8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E8D8A8",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.navy,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* =========================
     FORM
  ========================= */

  formCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
  },

  securityCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 15,
  },

  inputGroup: {
    marginBottom: 15,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
    gap: 7,
  },

  labelIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
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

  buttonWrapper: {
    marginTop: 2,
  },

  /* =========================
     SECURITY INTRO
  ========================= */

  securityIntro: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  securityIntroIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  securityIntroText: {
    flex: 1,
  },

  securityIntroTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
  },

  securityIntroDescription: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 3,
  },

  securityMiniBadge: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: "#EDF7F1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  securityLine: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },

  /* =========================
     PIN INPUT
  ========================= */

  pinWrapper: {
    height: 51,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.white,
    overflow: "hidden",
  },

  pinIconBox: {
    width: 44,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F4EA",
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },

  pinInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 13,
    fontSize: 19,
    letterSpacing: 6,
    color: colors.navy,
    fontWeight: "700",
  },

  pinVisibilityToggle: {
    width: 36,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  /* =========================
     SECURITY NOTE
  ========================= */

  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    gap: 9,
    marginTop: 2,
  },

  noteIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#F1E7C8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8D8A8",
  },

  noteContent: {
    flex: 1,
  },

  noteTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 3,
  },

  noteText: {
    fontSize: 10.5,
    lineHeight: 16,
    color: colors.textMuted,
  },

  /* =========================
     GOLD / NAVY FOOTER
  ========================= */

  footer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
    paddingTop: 20,
    paddingBottom: 19,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: colors.navy,
    borderWidth: 1,
    borderColor: colors.gold,
    overflow: "hidden",

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },

  footerTopLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.gold,
  },

  footerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  footerIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "rgba(201,162,75,0.13)",
    borderWidth: 1,
    borderColor: "rgba(201,162,75,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  footerBrand: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.goldLight,
    letterSpacing: 0.4,
  },

  footerText: {
    fontSize: 10.5,
    color: "#D8DFE8",
    marginTop: 6,
  },

  footerDivider: {
    width: 55,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.gold,
    marginVertical: 11,
  },

  footerStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: "rgba(201,162,75,0.10)",
    borderWidth: 1,
    borderColor: "rgba(201,162,75,0.25)",
  },

  footerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },

  footerVersion: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.goldLight,
    letterSpacing: 0.4,
  },

  footerCopyright: {
    fontSize: 9,
    color: "#AEB9C7",
    marginTop: 9,
    textAlign: "center",
  },

  /* =========================
     MODAL
  ========================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20,42,69,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  modalCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 26,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 18,
    alignItems: "center",
    overflow: "hidden",

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 12,
  },

  modalTopAccent: {
    position: "absolute",
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

  modalTopAccentWarning: {
    backgroundColor: colors.gold,
  },

  modalIconOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  modalSuccessOuter: {
    backgroundColor: "#EAF6EF",
  },

  modalErrorOuter: {
    backgroundColor: "#FDEEEE",
  },

  modalWarningOuter: {
    backgroundColor: "#FFF8E8",
  },

  modalIconInner: {
    width: 61,
    height: 61,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },

  modalSuccessInner: {
    backgroundColor: "#D9F0E2",
  },

  modalErrorInner: {
    backgroundColor: "#F8DADA",
  },

  modalWarningInner: {
    backgroundColor: "#F9E9B9",
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.navy,
    textAlign: "center",
  },

  modalMessage: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
  },

  modalStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    marginTop: 16,
  },

  modalStatusSuccess: {
    backgroundColor: "#EDF7F1",
  },

  modalStatusError: {
    backgroundColor: "#FDEEEE",
  },

  modalStatusWarning: {
    backgroundColor: "#FFF8E8",
  },

  modalStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  modalStatusTextSuccess: {
    color: colors.success,
  },

  modalStatusTextError: {
    color: colors.danger,
  },

  modalStatusTextWarning: {
    color: colors.warning,
  },

  modalButton: {
    width: "100%",
    height: 51,
    borderRadius: 14,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    gap: 8,
  },

  modalButtonSuccess: {
    backgroundColor: colors.success,
  },

  modalButtonError: {
    backgroundColor: colors.danger,
  },

  modalButtonWarning: {
    backgroundColor: colors.gold,
  },

  modalButtonPressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  modalButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  /* =========================
     MODAL CANCEL
  ========================= */

  modalCancelButton: {
    width: "100%",
    height: 43,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: colors.border,
  },

  modalCancelPressed: {
    backgroundColor: "#EEF1F4",
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  modalCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});
