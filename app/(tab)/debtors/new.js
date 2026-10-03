import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import BottomNav, {
  bottomNavHeight,
} from "@/components/BottomNav";

import {
  colors,
  spacing,
  typography,
} from "@/constants/theme";

import { createDebtor } from "@/db/database";
import { useAuth } from "@/context/AuthContext";

export default function NewDebtorScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [profilePhotoUri, setProfilePhotoUri] = useState(null);
  const [idPhotoUri, setIdPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const profilePhotoHandlers = usePhotoHandlers(
    setProfilePhotoUri,
    "Profile photo"
  );
  const idPhotoHandlers = usePhotoHandlers(
    setIdPhotoUri,
    "ID photo"
  );

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert(
        "Name required",
        "Please enter the customer's full name."
      );
      return;
    }

    setSaving(true);

    try {
      const id = await createDebtor(db, user?.id, {
        full_name: fullName.trim(),
        contact_number: contact.trim() || null,
        id_number: idNumber.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        credit_limit: Number(creditLimit) || 0,
        profile_photo_uri: profilePhotoUri,
        id_photo_uri: idPhotoUri,
      });

      router.replace(`/debtors/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed,
          ]}
        >
          <Ionicons
            name="close"
            size={25}
            color={colors.white}
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>
            CUSTOMER
          </Text>

          <Text style={styles.title}>
            New debtor profile
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.headerDot} />
        </View>
      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollView
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* =====================================================
            PROFILE CARD
        ===================================================== */}

        <View style={styles.profileCard}>
          <View style={styles.profileGlow} />
          <View style={styles.profileGlowTwo} />

          <View style={styles.profileTopBadge}>
            <Ionicons
              name="person-add-outline"
              size={13}
              color={colors.goldLight}
            />

            <Text style={styles.profileTopBadgeText}>
              NEW CUSTOMER
            </Text>
          </View>

          <Text style={styles.profileTitle}>
            Add profile photo
          </Text>

          <Text style={styles.profileSubtitle}>
            Use a clear photo to identify this customer
          </Text>

          <DebtorPhotoPicker
            photoUri={profilePhotoUri}
            photoName="Profile photo"
            {...profilePhotoHandlers}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="card-outline"
                size={18}
                color={colors.navy}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                ID verification
              </Text>

              <Text style={styles.sectionSubtitle}>
                Store the customer ID photo separately
              </Text>
            </View>
          </View>

          <View style={styles.fieldsCard}>
            <DebtorPhotoPicker
              photoUri={idPhotoUri}
              photoName="ID photo"
              {...idPhotoHandlers}
            />
          </View>
        </View>

        {/* =====================================================
            BASIC INFORMATION
        ===================================================== */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="person-outline"
                size={18}
                color={colors.navy}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                Basic Information
              </Text>

              <Text style={styles.sectionSubtitle}>
                Customer identity and contact details
              </Text>
            </View>
          </View>

          <View style={styles.fieldsCard}>
            <DebtorFields
              fullName={fullName}
              setFullName={setFullName}
              contact={contact}
              setContact={setContact}
              idNumber={idNumber}
              setIdNumber={setIdNumber}
              address={address}
              setAddress={setAddress}
              notes={notes}
              setNotes={setNotes}
              creditLimit={creditLimit}
              setCreditLimit={setCreditLimit}
            />
          </View>
        </View>

        {/* =====================================================
            SAVE SECTION
        ===================================================== */}

        <View style={styles.saveSection}>
          <View style={styles.saveCard}>
            <View style={styles.saveHeader}>
              <View style={styles.saveIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.navy}
                />
              </View>

              <View style={styles.saveHeaderText}>
                <Text style={styles.saveTitle}>
                  Ready to save?
                </Text>

                <Text style={styles.saveSubtitle}>
                  Create this customer account
                </Text>
              </View>

              <View style={styles.saveStatus}>
                <View style={styles.saveStatusDot} />

                <Text style={styles.saveStatusText}>
                  READY
                </Text>
              </View>
            </View>

            {/* =================================================
                GOLD SAVE BUTTON
            ================================================= */}

            <Pressable
              disabled={saving}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed &&
                  !saving &&
                  styles.saveButtonPressed,
                saving &&
                  styles.saveButtonDisabled,
              ]}
            >
              {saving ? (
                <View style={styles.saveButtonContent}>
                  <ActivityIndicator
                    size="small"
                    color={colors.navy}
                  />

                  <Text style={styles.saveButtonText}>
                    Saving...
                  </Text>
                </View>
              ) : (
                <View style={styles.saveButtonContent}>
                  <View style={styles.saveButtonIcon}>
                    <Ionicons
                      name="checkmark"
                      size={19}
                      color={colors.goldLight}
                    />
                  </View>

                  <Text style={styles.saveButtonText}>
                    Save Debtor
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={colors.navy}
                  />
                </View>
              )}
            </Pressable>

            {/* =================================================
                SECURITY HINT
            ================================================= */}

            <View style={styles.saveHint}>
              <View style={styles.saveHintIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={13}
                  color={colors.success}
                />
              </View>

              <Text style={styles.saveHintText}>
                Customer information will be saved securely.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* =====================================================
          BOTTOM NAVIGATION
      ===================================================== */}

      <BottomNav activeTab="debtors" />
    </SafeAreaView>
  );
}

/* =========================================================
   PHOTO HANDLERS
========================================================= */

export function usePhotoHandlers(setPhotoUri, photoName) {
  const [removeModalVisible, setRemoveModalVisible] =
    useState(false);

  async function onTakePhoto() {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        `Camera access is required to take a ${photoName.toLowerCase()}.`
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.6,
        allowsEditing: true,
        aspect: [4, 3],
      });

    if (
      !result.canceled &&
      result.assets?.[0]?.uri
    ) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function onPickPhoto() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        `Photo library access is required to select a ${photoName.toLowerCase()}.`
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.6,
        allowsEditing: true,
        aspect: [4, 3],
      });

    if (
      !result.canceled &&
      result.assets?.[0]?.uri
    ) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  function onRemovePhoto() {
    setRemoveModalVisible(true);
  }

  function confirmRemovePhoto() {
    setPhotoUri(null);
    setRemoveModalVisible(false);
  }

  function cancelRemovePhoto() {
    setRemoveModalVisible(false);
  }

  return {
    onTakePhoto,
    onPickPhoto,
    onRemovePhoto,
    removeModalVisible,
    confirmRemovePhoto,
    cancelRemovePhoto,
  };
}

/* =========================================================
   DEBTOR FIELDS
========================================================= */

export function DebtorFields(props) {
  return (
    <>
      <Field
        label="Full name *"
        icon="person-outline"
      >
        <TextInput
          value={props.fullName}
          onChangeText={props.setFullName}
          placeholder="e.g. Maria Santos"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Field>

      <Field
        label="Contact number"
        icon="call-outline"
      >
        <TextInput
          value={props.contact}
          onChangeText={props.setContact}
          placeholder="09XX XXX XXXX"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          style={styles.input}
        />
      </Field>

      <Field
        label="ID number"
        icon="card-outline"
      >
        <TextInput
          value={props.idNumber}
          onChangeText={props.setIdNumber}
          placeholder="e.g. 1234-5678-9012"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          style={styles.input}
        />
      </Field>

      <Field
        label="Address"
        icon="location-outline"
      >
        <TextInput
          value={props.address}
          onChangeText={props.setAddress}
          placeholder="House no., street, barangay"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Field>

      <Field
        label="Notes"
        icon="document-text-outline"
      >
        <TextInput
          value={props.notes}
          onChangeText={props.setNotes}
          placeholder="Optional notes about this customer"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            styles.textArea,
          ]}
          multiline
        />
      </Field>

      <Field
        label="Credit limit"
        icon="cash-outline"
      >
        <TextInput
          value={props.creditLimit}
          onChangeText={props.setCreditLimit}
          placeholder="0 means no limit"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />
      </Field>
    </>
  );
}

/* =========================================================
   PROFILE PHOTO
========================================================= */

export function DebtorPhotoPicker({
  photoUri,
  photoName,
  onTakePhoto,
  onPickPhoto,
  onRemovePhoto,
  removeModalVisible,
  confirmRemovePhoto,
  cancelRemovePhoto,
}) {
  return (
    <>
      {photoUri ? (
        <View style={styles.profilePhotoArea}>
          {/* PHOTO */}

          <View style={styles.profilePhotoOuter}>
            <Image
              source={{ uri: photoUri }}
              style={styles.profilePhoto}
            />

            <View style={styles.photoCheckBadge}>
              <Ionicons
                name="checkmark"
                size={15}
                color={colors.white}
              />
            </View>

            <Pressable
              onPress={onTakePhoto}
              style={({ pressed }) => [
                styles.cameraFloatingButton,
                pressed &&
                  styles.cameraFloatingPressed,
              ]}
            >
              <Ionicons
                name="camera"
                size={19}
                color={colors.navy}
              />
            </Pressable>
          </View>

          {/* PHOTO STATUS */}

          <View style={styles.photoStatus}>
            <View style={styles.photoStatusIcon}>
              <Ionicons
                name="checkmark"
                size={11}
                color={colors.white}
              />
            </View>

            <Text style={styles.photoAttachedText}>
              {photoName} attached
            </Text>
          </View>

          {/* PHOTO ACTIONS */}

          <View style={styles.photoActions}>
            <Pressable
              style={({ pressed }) => [
                styles.photoButton,
                pressed &&
                  styles.photoButtonPressed,
              ]}
              onPress={onTakePhoto}
            >
              <View style={styles.photoButtonIcon}>
                <Ionicons
                  name="camera-outline"
                  size={17}
                  color={colors.goldLight}
                />
              </View>

              <Text style={styles.photoButtonText}>
                Retake
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.photoButton,
                pressed &&
                  styles.photoButtonPressed,
              ]}
              onPress={onPickPhoto}
            >
              <View style={styles.photoButtonIcon}>
                <Ionicons
                  name="image-outline"
                  size={17}
                  color={colors.goldLight}
                />
              </View>

              <Text style={styles.photoButtonText}>
                Change
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.photoButton,
                styles.photoRemove,
                pressed &&
                  styles.photoButtonPressed,
              ]}
              onPress={onRemovePhoto}
            >
              <View style={styles.photoRemoveIcon}>
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.danger}
                />
              </View>

              <Text
                style={[
                  styles.photoButtonText,
                  styles.photoRemoveText,
                ]}
              >
                Remove
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.profilePhotoArea}>
          {/* EMPTY PHOTO */}

          <View style={styles.profilePhotoOuter}>
            <View style={styles.profilePlaceholder}>
              <View style={styles.placeholderIconCircle}>
                <Ionicons
                  name="person"
                  size={47}
                  color={colors.goldLight}
                />
              </View>
            </View>

            <Pressable
              onPress={onTakePhoto}
              style={({ pressed }) => [
                styles.cameraFloatingButton,
                pressed &&
                  styles.cameraFloatingPressed,
              ]}
            >
              <Ionicons
                name="camera"
                size={19}
                color={colors.navy}
              />
            </Pressable>
          </View>

          <Text style={styles.photoHint}>
            Tap the camera to take a photo
          </Text>

          {/* EMPTY PHOTO ACTIONS */}

          <View style={styles.photoActions}>
            <Pressable
              style={({ pressed }) => [
                styles.photoButton,
                styles.photoButtonLarge,
                pressed &&
                  styles.photoButtonPressed,
              ]}
              onPress={onTakePhoto}
            >
              <View style={styles.photoButtonIcon}>
                <Ionicons
                  name="camera-outline"
                  size={18}
                  color={colors.goldLight}
                />
              </View>

              <Text style={styles.photoButtonText}>
                Take Photo
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.photoButton,
                styles.photoButtonLarge,
                pressed &&
                  styles.photoButtonPressed,
              ]}
              onPress={onPickPhoto}
            >
              <View style={styles.photoButtonIcon}>
                <Ionicons
                  name="image-outline"
                  size={18}
                  color={colors.goldLight}
                />
              </View>

              <Text style={styles.photoButtonText}>
                Choose
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* =====================================================
          CUSTOM REMOVE PHOTO MODAL
      ===================================================== */}

      <Modal
        visible={removeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelRemovePhoto}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.removeModal}>
            {/* Decorative glow */}

            <View style={styles.modalGlow} />

            {/* Icon */}

            <View style={styles.modalIconOuter}>
              <View style={styles.modalIcon}>
                <Ionicons
                  name="trash-outline"
                  size={27}
                  color={colors.danger}
                />
              </View>
            </View>

            {/* Badge */}

            <View style={styles.modalBadge}>
              <View style={styles.modalBadgeDot} />

              <Text style={styles.modalBadgeText}>
                REMOVE PHOTO
              </Text>
            </View>

            {/* Title */}

            <Text style={styles.modalTitle}>
              Remove {photoName}?
            </Text>

            <Text style={styles.modalMessage}>
              Are you sure you want to remove the
              attached {photoName.toLowerCase()} from this customer?
            </Text>

            {/* Divider */}

            <View style={styles.modalDivider} />

            {/* Buttons */}

            <View style={styles.modalButtons}>
              <Pressable
                onPress={cancelRemovePhoto}
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed &&
                    styles.modalButtonPressed,
                ]}
              >
                <Ionicons
                  name="close-outline"
                  size={18}
                  color={colors.navy}
                />

                <Text style={styles.modalCancelText}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmRemovePhoto}
                style={({ pressed }) => [
                  styles.modalRemoveButton,
                  pressed &&
                    styles.modalRemoveButtonPressed,
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.white}
                />

                <Text style={styles.modalRemoveText}>
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  icon,
  children,
}) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <View style={styles.fieldIcon}>
            <Ionicons
              name={icon}
              size={14}
              color={colors.goldLight}
            />
          </View>

          <Text style={styles.label}>
            {label}
          </Text>
        </View>

        {label.includes("*") && (
          <View style={styles.requiredBadge}>
            <View style={styles.requiredDot} />

            <Text style={styles.requiredText}>
              REQUIRED
            </Text>
          </View>
        )}
      </View>

      {children}
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  /* =====================================================
     HEADER
  ===================================================== */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 14,

    backgroundColor: colors.cream,

    borderBottomWidth: 1,
    borderBottomColor: "#142C4A0D",
  },

  closeButton: {
    width: 46,
    height: 46,

    borderRadius: 15,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.danger,

    borderWidth: 2,
    borderColor: colors.white,

    shadowColor: colors.danger,
    shadowOpacity: 0.35,
    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 8,
  },

  closeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.8,

    color: colors.goldLight,

    marginBottom: 3,
  },

  title: {
    ...typography.heading,

    color: colors.navy,

    fontSize: 17,
    fontWeight: "900",
  },

  headerRight: {
    width: 46,

    alignItems: "center",
    justifyContent: "center",
  },

  headerDot: {
    width: 7,
    height: 7,

    borderRadius: 4,

    backgroundColor: colors.goldLight,
  },

  /* =====================================================
     FORM
  ===================================================== */

  form: {
    paddingHorizontal: spacing.md,

    paddingTop: 14,

    gap: 21,

    paddingBottom:
      bottomNavHeight +
      spacing.xl +
      70,
  },

  /* =====================================================
     PROFILE CARD
  ===================================================== */

  profileCard: {
    position: "relative",

    alignItems: "center",

    overflow: "hidden",

    backgroundColor: colors.navy,

    borderRadius: 27,

    paddingTop: 21,
    paddingBottom: 20,
    paddingHorizontal: spacing.md,

    borderWidth: 1,
    borderColor: "#385775",

    shadowColor: colors.navy,
    shadowOpacity: 0.28,
    shadowRadius: 17,

    shadowOffset: {
      width: 0,
      height: 9,
    },

    elevation: 8,
  },

  profileGlow: {
    position: "absolute",

    width: 230,
    height: 230,

    borderRadius: 115,

    backgroundColor: "#D9A92816",

    top: -130,
    right: -75,
  },

  profileGlowTwo: {
    position: "absolute",

    width: 170,
    height: 170,

    borderRadius: 100,

    backgroundColor: "#FFFFFF06",

    bottom: -90,
    left: -65,
  },

  profileTopBadge: {
    flexDirection: "row",
    alignItems: "center",

    gap: 5,

    backgroundColor: "#D9A92818",

    borderWidth: 1,
    borderColor: "#D9A92845",

    borderRadius: 20,

    paddingHorizontal: 11,
    paddingVertical: 5,

    marginBottom: 8,
  },

  profileTopBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",

    letterSpacing: 1.25,

    color: colors.goldLight,
  },

  profileTitle: {
    fontSize: 19,
    fontWeight: "900",

    color: colors.white,
  },

  profileSubtitle: {
    fontSize: 10,

    lineHeight: 15,

    color: "#FFFFFFA8",

    marginTop: 5,
    marginBottom: 17,

    textAlign: "center",
  },

  /* =====================================================
     PHOTO
  ===================================================== */

  profilePhotoArea: {
    width: "100%",

    alignItems: "center",
  },

  profilePhotoOuter: {
    width: 150,
    height: 150,

    borderRadius: 75,

    padding: 5,

    backgroundColor: "#D9A92822",

    borderWidth: 2,
    borderColor: colors.goldLight,

    shadowColor: colors.goldLight,
    shadowOpacity: 0.25,
    shadowRadius: 14,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 8,

    position: "relative",
  },

  profilePlaceholder: {
    width: "100%",
    height: "100%",

    borderRadius: 75,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFFFFF0D",

    borderWidth: 1,
    borderColor: "#FFFFFF20",
  },

  placeholderIconCircle: {
    width: 82,
    height: 82,

    borderRadius: 41,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#D9A92815",

    borderWidth: 1,
    borderColor: "#D9A92835",
  },

  profilePhoto: {
    width: "100%",
    height: "100%",

    borderRadius: 75,
  },

  cameraFloatingButton: {
    position: "absolute",

    right: -4,
    bottom: 3,

    width: 49,
    height: 49,

    borderRadius: 25,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.goldLight,

    borderWidth: 4,
    borderColor: colors.navy,

    shadowColor: colors.goldLight,
    shadowOpacity: 0.38,
    shadowRadius: 9,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 9,
  },

  cameraFloatingPressed: {
    transform: [{ scale: 0.86 }],
    opacity: 0.8,
  },

  photoCheckBadge: {
    position: "absolute",

    left: -3,
    bottom: 6,

    width: 31,
    height: 31,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.success,

    borderWidth: 3,
    borderColor: colors.navy,
  },

  photoHint: {
    marginTop: 11,
    marginBottom: 13,

    fontSize: 9,

    fontWeight: "700",

    color: "#FFFFFF90",
  },

  photoStatus: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    marginTop: 10,
    marginBottom: 12,

    paddingHorizontal: 11,
    paddingVertical: 6,

    borderRadius: 20,

    backgroundColor: "#22C55E13",

    borderWidth: 1,
    borderColor: "#22C55E35",
  },

  photoStatusIcon: {
    width: 17,
    height: 17,

    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.success,
  },

  photoAttachedText: {
    fontSize: 9.5,

    fontWeight: "800",

    color: colors.goldLight,
  },

  /* =====================================================
     PHOTO BUTTONS
  ===================================================== */

  photoActions: {
    width: "100%",

    flexDirection: "row",

    gap: 8,
  },

  photoButton: {
    flex: 1,

    minHeight: 47,

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    gap: 6,

    paddingHorizontal: 7,

    borderRadius: 13,

    backgroundColor: colors.cream,

    borderWidth: 1,
    borderColor: "#FFFFFF38",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  photoButtonLarge: {
    minHeight: 49,
  },

  photoButtonIcon: {
    width: 27,
    height: 27,

    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.navy,
  },

  photoButtonPressed: {
    opacity: 0.65,

    transform: [{ scale: 0.96 }],
  },

  photoButtonText: {
    color: colors.navy,

    fontWeight: "900",

    fontSize: 10.5,
  },

  photoRemove: {
    borderColor: colors.danger,

    backgroundColor: colors.cream,
  },

  photoRemoveIcon: {
    width: 27,
    height: 27,

    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#B3413B12",
  },

  photoRemoveText: {
    color: colors.danger,
  },

  /* =====================================================
     INFORMATION SECTION
  ===================================================== */

  section: {
    gap: 10,
  },

  sectionHeader: {
    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    paddingHorizontal: 2,
  },

  sectionIcon: {
    width: 40,
    height: 40,

    borderRadius: 13,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.goldLight,

    shadowColor: colors.goldLight,
    shadowOpacity: 0.16,
    shadowRadius: 7,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 3,
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 14.5,

    fontWeight: "900",

    color: colors.navy,
  },

  sectionSubtitle: {
    fontSize: 9.5,

    color: colors.textMuted,

    marginTop: 3,
  },

  /* =====================================================
     FIELDS CARD
  ===================================================== */

  fieldsCard: {
    backgroundColor: colors.white,

    borderRadius: 21,

    padding: spacing.md,

    gap: 16,

    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: colors.navy,
    shadowOpacity: 0.06,
    shadowRadius: 13,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 3,
  },

  field: {
    gap: 7,
  },

  labelRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",
  },

  labelLeft: {
    flexDirection: "row",

    alignItems: "center",

    gap: 7,

    flex: 1,
  },

  fieldIcon: {
    width: 27,
    height: 27,

    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.navy,
  },

  label: {
    ...typography.label,

    color: colors.navy,

    fontSize: 11.5,

    fontWeight: "900",
  },

  requiredBadge: {
    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    backgroundColor: "#B3413B10",

    borderWidth: 1,
    borderColor: "#B3413B20",

    borderRadius: 7,

    paddingHorizontal: 7,
    paddingVertical: 3.5,
  },

  requiredDot: {
    width: 4,
    height: 4,

    borderRadius: 2,

    backgroundColor: colors.danger,
  },

  requiredText: {
    fontSize: 6.5,

    fontWeight: "900",

    letterSpacing: 0.65,

    color: colors.danger,
  },

  input: {
    backgroundColor: colors.cream,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 13,

    paddingHorizontal: spacing.md,

    paddingVertical: 12,

    minHeight: 50,

    fontSize: 14,

    color: colors.text,

    shadowColor: colors.navy,
    shadowOpacity: 0.02,
    shadowRadius: 3,

    shadowOffset: {
      width: 0,
      height: 1,
    },
  },

  textArea: {
    height: 95,

    textAlignVertical: "top",

    paddingTop: 13,
  },

  /* =====================================================
     SAVE SECTION
  ===================================================== */

  saveSection: {
    marginTop: -2,

    paddingBottom: 10,
  },

  saveCard: {
    width: "100%",

    backgroundColor: colors.white,

    borderRadius: 23,

    padding: 15,

    borderWidth: 1,
    borderColor: "#D9A92855",

    shadowColor: colors.navy,
    shadowOpacity: 0.075,
    shadowRadius: 14,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 4,
  },

  saveHeader: {
    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    marginBottom: 14,
  },

  saveIcon: {
    width: 43,
    height: 43,

    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.goldLight,

    shadowColor: colors.goldLight,
    shadowOpacity: 0.22,
    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 4,
  },

  saveHeaderText: {
    flex: 1,
  },

  saveTitle: {
    fontSize: 14.5,

    fontWeight: "900",

    color: colors.navy,
  },

  saveSubtitle: {
    fontSize: 9.5,

    color: colors.textMuted,

    marginTop: 2,
  },

  saveStatus: {
    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    paddingHorizontal: 7,

    paddingVertical: 4,

    borderRadius: 10,

    backgroundColor: "#22C55E12",

    borderWidth: 1,

    borderColor: "#22C55E30",
  },

  saveStatusDot: {
    width: 5,
    height: 5,

    borderRadius: 3,

    backgroundColor: colors.success,
  },

  saveStatusText: {
    fontSize: 6.5,

    fontWeight: "900",

    letterSpacing: 0.5,

    color: colors.success,
  },

  /* =====================================================
     ACTUAL GOLD SAVE BUTTON
  ===================================================== */

  saveButton: {
    width: "100%",

    minHeight: 60,

    borderRadius: 17,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.goldLight,

    borderWidth: 2,
    borderColor: "#E8C75D",

    shadowColor: colors.goldLight,

    shadowOpacity: 0.45,

    shadowRadius: 14,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    elevation: 9,
  },

  saveButtonPressed: {
    transform: [
      {
        scale: 0.97,
      },
    ],

    opacity: 0.9,

    shadowOpacity: 0.25,
  },

  saveButtonDisabled: {
    opacity: 0.72,
  },

  saveButtonContent: {
    width: "100%",

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    gap: 10,

    paddingHorizontal: 18,
  },

  saveButtonIcon: {
    width: 31,
    height: 31,

    borderRadius: 10,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.navy,
  },

  saveButtonText: {
    flex: 1,

    color: colors.navy,

    fontSize: 15,

    fontWeight: "900",

    letterSpacing: 0.2,
  },

  /* =====================================================
     SAVE HINT
  ===================================================== */

  saveHint: {
    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    gap: 6,

    marginTop: 12,
  },

  saveHintIcon: {
    width: 22,
    height: 22,

    borderRadius: 7,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#22C55E12",
  },

  saveHintText: {
    fontSize: 8.5,

    color: colors.textMuted,

    textAlign: "center",
  },

  /* =====================================================
     CUSTOM MODAL
  ===================================================== */

  modalOverlay: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 24,

    backgroundColor: "rgba(9, 25, 43, 0.78)",
  },

  removeModal: {
    width: "100%",

    maxWidth: 390,

    position: "relative",

    overflow: "hidden",

    alignItems: "center",

    backgroundColor: colors.white,

    borderRadius: 27,

    paddingHorizontal: 20,

    paddingTop: 25,

    paddingBottom: 20,

    borderWidth: 1,

    borderColor: "#D9A92855",

    shadowColor: colors.navy,

    shadowOpacity: 0.3,

    shadowRadius: 25,

    shadowOffset: {
      width: 0,
      height: 12,
    },

    elevation: 15,
  },

  modalGlow: {
    position: "absolute",

    width: 210,
    height: 210,

    borderRadius: 105,

    backgroundColor: "#D9A92812",

    top: -145,

    right: -95,
  },

  modalIconOuter: {
    width: 74,
    height: 74,

    borderRadius: 23,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#B3413B12",

    borderWidth: 1,

    borderColor: "#B3413B30",

    shadowColor: colors.danger,

    shadowOpacity: 0.12,

    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  modalIcon: {
    width: 53,
    height: 53,

    borderRadius: 18,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.white,

    borderWidth: 1,

    borderColor: "#B3413B25",
  },

  modalBadge: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    marginTop: 15,

    paddingHorizontal: 10,

    paddingVertical: 5,

    borderRadius: 20,

    backgroundColor: "#B3413B10",

    borderWidth: 1,

    borderColor: "#B3413B25",
  },

  modalBadgeDot: {
    width: 5,
    height: 5,

    borderRadius: 3,

    backgroundColor: colors.danger,
  },

  modalBadgeText: {
    fontSize: 7,

    fontWeight: "900",

    letterSpacing: 1,

    color: colors.danger,
  },

  modalTitle: {
    marginTop: 12,

    fontSize: 20,

    fontWeight: "900",

    color: colors.navy,

    textAlign: "center",
  },

  modalMessage: {
    marginTop: 8,

    maxWidth: 290,

    fontSize: 11,

    lineHeight: 17,

    fontWeight: "500",

    color: colors.textMuted,

    textAlign: "center",
  },

  modalDivider: {
    width: "100%",

    height: 1,

    marginTop: 18,

    marginBottom: 15,

    backgroundColor: colors.border,
  },

  modalButtons: {
    width: "100%",

    flexDirection: "row",

    gap: 9,
  },

  modalCancelButton: {
    flex: 1,

    minHeight: 51,

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    gap: 6,

    borderRadius: 14,

    backgroundColor: colors.cream,

    borderWidth: 1,

    borderColor: colors.border,

    shadowColor: colors.navy,

    shadowOpacity: 0.05,

    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  modalCancelText: {
    fontSize: 11,

    fontWeight: "900",

    color: colors.navy,
  },

  modalRemoveButton: {
    flex: 1,

    minHeight: 51,

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    gap: 6,

    borderRadius: 14,

    backgroundColor: colors.danger,

    borderWidth: 2,

    borderColor: "#C95A53",

    shadowColor: colors.danger,

    shadowOpacity: 0.28,

    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 6,
  },

  modalRemoveText: {
    fontSize: 11,

    fontWeight: "900",

    color: colors.white,
  },

  modalButtonPressed: {
    transform: [{ scale: 0.96 }],

    opacity: 0.75,
  },

  modalRemoveButtonPressed: {
    transform: [{ scale: 0.96 }],

    opacity: 0.82,

    shadowOpacity: 0.15,
  },
});


