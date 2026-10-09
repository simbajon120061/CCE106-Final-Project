import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";

import Card from "@/components/Card";
import { colors, spacing, radius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import TopHeader from "@/components/TopHeader";
import { getFirebaseAuth } from "@/firebaseConfig";
import {
  getFirebaseUidForUser,
  setFirebaseUidForUser,
} from "@/db/database";
import {
  cancelCloudSync,
  configureCloudBackupInterval,
  getCloudSyncState,
  retryCloudSync,
  subscribeCloudSync,
  syncLinkedStore,
} from "@/db/cloudSync";

const CLOUD_BACKUP_SETTINGS_KEY = "track-and-tally:backup-settings:";

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [cloudModalVisible, setCloudModalVisible] = useState(false);
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudPassword, setCloudPassword] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudCancelRequested, setCloudCancelRequested] = useState(false);
  const [cloudFeedback, setCloudFeedback] = useState(null);
  const cloudCancelRequestedRef = useRef(false);
  const [cloudUser, setCloudUser] = useState(getFirebaseAuth().currentUser);
  const [linkedFirebaseUid, setLinkedFirebaseUid] = useState(null);
  const [linkedLocalUserId, setLinkedLocalUserId] = useState(null);
  const [cloudSyncState, setCloudSyncState] = useState(() =>
    getCloudSyncState(user?.id)
  );
  const [backupSchedule, setBackupSchedule] = useState("12");
  const [customBackupHours, setCustomBackupHours] = useState("");
  const [backupSettingsUserId, setBackupSettingsUserId] = useState(null);
  const [savedBackupFrequency, setSavedBackupFrequency] = useState({
    schedule: "12",
    customHours: "",
  });
  const [backupFrequencySaving, setBackupFrequencySaving] = useState(false);
  const [backupFrequencyFeedback, setBackupFrequencyFeedback] = useState(null);
  const backupScheduleLoading =
    user?.id != null && backupSettingsUserId !== String(user.id);
  const firebaseAuth = getFirebaseAuth();
  const linkedFirebaseUidForUser =
    linkedLocalUserId === user?.id ? linkedFirebaseUid : null;
  const cloudOperationActive =
    cloudBusy ||
    cloudSyncState.status === "queued" ||
    cloudSyncState.status === "syncing" ||
    cloudSyncState.status === "cancelling";
  const cloudCancelPending =
    cloudCancelRequested &&
    (cloudBusy || cloudSyncState.status === "cancelling");

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, setCloudUser);
  }, [firebaseAuth]);

  useEffect(() => {
    return subscribeCloudSync((localUserId, state) => {
      if (String(localUserId) === String(user?.id)) {
        setCloudSyncState(state);
      }
    });
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!user?.id) return undefined;

    AsyncStorage.getItem(`${CLOUD_BACKUP_SETTINGS_KEY}${user.id}`)
      .then((stored) => {
        if (!active) return;
        if (!stored) {
          setBackupSchedule("12");
          setCustomBackupHours("");
          setSavedBackupFrequency({ schedule: "12", customHours: "" });
          return;
        }
        const settings = JSON.parse(stored);
        const loadedFrequency = {
          schedule:
            settings.schedule === "8" ||
            settings.schedule === "custom"
              ? settings.schedule
              : "12",
          customHours:
            settings.customHours == null
              ? ""
              : String(settings.customHours),
        };
        setBackupSchedule(loadedFrequency.schedule);
        setCustomBackupHours(loadedFrequency.customHours);
        setSavedBackupFrequency(loadedFrequency);
      })
      .catch((error) => {
        console.error("Could not load cloud backup settings:", error);
        if (active) {
          setBackupSchedule("12");
          setCustomBackupHours("");
          setSavedBackupFrequency({ schedule: "12", customHours: "" });
        }
      })
      .finally(() => {
        if (active) {
          setBackupSettingsUserId(String(user.id));
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const backupFrequencyDirty =
    backupSchedule !== savedBackupFrequency.schedule ||
    customBackupHours !== savedBackupFrequency.customHours;
  const backupFrequencyHours =
    backupSchedule === "custom"
      ? Number(customBackupHours)
      : Number(backupSchedule);
  const backupFrequencyValid =
    Number.isFinite(backupFrequencyHours) &&
    backupFrequencyHours >= 1 &&
    Number.isFinite(backupFrequencyHours * 60 * 60 * 1000);

  async function saveBackupFrequency() {
    if (!user?.id || backupFrequencySaving) return;

    const intervalHours =
      backupSchedule === "custom"
        ? Number(customBackupHours)
        : Number(backupSchedule);
    if (
      !Number.isFinite(intervalHours) ||
      intervalHours < 1 ||
      !Number.isFinite(intervalHours * 60 * 60 * 1000)
    ) {
      setBackupFrequencyFeedback({
        type: "error",
        message: "Enter a valid custom interval of at least 1 hour.",
      });
      return;
    }

    const frequency = {
      schedule: backupSchedule,
      customHours: customBackupHours,
    };
    setBackupFrequencySaving(true);
    setBackupFrequencyFeedback(null);
    try {
      await AsyncStorage.setItem(
        `${CLOUD_BACKUP_SETTINGS_KEY}${user.id}`,
        JSON.stringify(frequency)
      );
      configureCloudBackupInterval(db, user.id, intervalHours);
      setSavedBackupFrequency(frequency);
      setBackupFrequencyFeedback({
        type: "success",
        message: `Backup frequency saved: every ${intervalHours} hour${
          intervalHours === 1 ? "" : "s"
        }.`,
      });
    } catch (error) {
      console.error("Could not save cloud backup frequency:", error);
      setBackupFrequencyFeedback({
        type: "error",
        message:
          error?.message || "Could not save the backup frequency. Try again.",
      });
    } finally {
      setBackupFrequencySaving(false);
    }
  }

  useEffect(() => {
    let active = true;
    if (!user?.id) return undefined;

    getFirebaseUidForUser(db, user.id)
      .then((uid) => {
        if (active) {
          setLinkedFirebaseUid(uid);
          setLinkedLocalUserId(user.id);
        }
      })
      .catch((error) => {
        console.error("Could not load linked cloud account:", error);
      });

    return () => {
      active = false;
    };
  }, [db, user?.id]);

  async function backUpToCloud(firebaseUser) {
    throwIfCloudBackupCancelled(cloudCancelRequestedRef);
    if (!user?.id) {
      throw new Error("Log in to a local store account before cloud backup.");
    }

    const linkedUid = await getFirebaseUidForUser(db, user.id);
    throwIfCloudBackupCancelled(cloudCancelRequestedRef);
    if (linkedUid && linkedUid !== firebaseUser.uid) {
      await setFirebaseUidForUser(db, user.id, firebaseUser.uid);
      setLinkedFirebaseUid(firebaseUser.uid);
      setLinkedLocalUserId(user.id);
    } else if (!linkedUid) {
      await setFirebaseUidForUser(db, user.id, firebaseUser.uid);
      setLinkedFirebaseUid(firebaseUser.uid);
      setLinkedLocalUserId(user.id);
    }

    throwIfCloudBackupCancelled(cloudCancelRequestedRef);
    const result = await syncLinkedStore(db, user.id);
    if (result.status === "cancelled") {
      throw createCloudBackupCancelledError();
    }
    if (result.status !== "synced") {
      throw new Error(
        result.message ||
          "Firebase is connected, but the local store has not synced yet."
      );
    }
    return result;
  }

  function cancelCloudBackup() {
    if (!cloudOperationActive || cloudCancelRequestedRef.current) return;
    cloudCancelRequestedRef.current = true;
    setCloudCancelRequested(true);
    if (user?.id) cancelCloudSync(user.id);
  }

  async function handleCloudBackup() {
    if (cloudOperationActive) {
      cancelCloudBackup();
      return;
    }
    if (!cloudUser || linkedFirebaseUidForUser !== cloudUser.uid) {
      setCloudFeedback(null);
      setCloudModalVisible(true);
      return;
    }

    cloudCancelRequestedRef.current = false;
    setCloudCancelRequested(false);
    setCloudBusy(true);
    setCloudFeedback(null);
    try {
      const result = await backUpToCloud(cloudUser);
      setCloudFeedback({
        type: "success",
        message: getCloudBackupSummary(result),
      });
    } catch (error) {
      if (error?.code !== "cloud-sync/cancelled") {
        console.error("Cloud backup failed:", error);
      }
      setCloudFeedback({
        type: error?.code === "cloud-sync/cancelled" ? "status" : "error",
        message: getCloudErrorMessage(error),
      });
    } finally {
      setCloudBusy(false);
      cloudCancelRequestedRef.current = false;
      setCloudCancelRequested(false);
    }
  }

  async function handleCloudAuth(action) {
    const email = cloudEmail.trim().toLowerCase();
    if (!email || !cloudPassword) {
      setCloudFeedback({
        type: "error",
        message: "Enter your email and password.",
      });
      return;
    }

    cloudCancelRequestedRef.current = false;
    setCloudCancelRequested(false);
    setCloudBusy(true);
    setCloudFeedback(null);
    try {
      const credentials =
        action === "create"
          ? await createUserWithEmailAndPassword(
              firebaseAuth,
              email,
              cloudPassword
            )
          : await signInWithEmailAndPassword(
              firebaseAuth,
              email,
              cloudPassword
            );
      const result = await backUpToCloud(credentials.user);
      setCloudModalVisible(false);
      setCloudPassword("");
      setCloudFeedback({
        type: "success",
        message: getCloudBackupSummary(result),
      });
    } catch (error) {
      if (error?.code !== "cloud-sync/cancelled") {
        console.error("Firebase sign-in or backup failed:", error);
      }
      setCloudFeedback({
        type: error?.code === "cloud-sync/cancelled" ? "status" : "error",
        message: getCloudErrorMessage(error),
      });
    } finally {
      setCloudBusy(false);
      cloudCancelRequestedRef.current = false;
      setCloudCancelRequested(false);
    }
  }

  function openLogoutModal() {
    setLogoutModalVisible(true);
  }

  function closeLogoutModal() {
    setLogoutModalVisible(false);
  }

  async function handleLogout() {
    setLogoutModalVisible(false);

    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* =========================
          TOP HEADER
      ========================= */}

      <TopHeader
        title="Settings"
        subtitle="Account Preferences"
        showSettings={false}
        showBack
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* =========================
            PROFILE HERO
        ========================= */}

        <View style={styles.profileHero}>
          <View style={styles.profileGlow} />

          <View style={styles.profileTop}>
            <View style={styles.storeIconOuter}>
              <View style={styles.storeIconInner}>
                <Ionicons
                  name="storefront"
                  size={30}
                  color={colors.gold}
                />
              </View>
            </View>

            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />

              <Text style={styles.activeText}>
                ACTIVE
              </Text>
            </View>
          </View>

          <Text style={styles.profileWelcome}>
            Store Account
          </Text>

          <Text style={styles.storeName}>
            {user?.storeName || "My Store"}
          </Text>

          <View style={styles.phoneContainer}>
            <Ionicons
              name="call-outline"
              size={14}
              color={colors.goldLight}
            />

            <Text style={styles.phoneText}>
              {user?.phoneNumber || "No phone number"}
            </Text>
          </View>

          <View style={styles.profileDivider} />

          <View style={styles.profileFooter}>
            <View style={styles.profileFooterItem}>
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={colors.gold}
              />

              <Text style={styles.profileFooterText}>
                Account Secured
              </Text>
            </View>

            <View style={styles.profileFooterItem}>
              <Ionicons
                name="phone-portrait-outline"
                size={17}
                color={colors.gold}
              />

              <Text style={styles.profileFooterText}>
                Local Account
              </Text>
            </View>
          </View>
        </View>

        {/* =========================
            ACCOUNT & STORE
        ========================= */}

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="person-outline"
              size={17}
              color={colors.gold}
            />
          </View>

          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>
              Account & Store
            </Text>

            <Text style={styles.sectionSubtitle}>
              Manage your store information
            </Text>
          </View>
        </View>

        <Card style={styles.accountCard}>
          <Pressable
            style={({ pressed }) => [
              styles.accountItem,
              pressed && styles.itemPressed,
            ]}
            onPress={() => router.push("/profile")}
          >
            <View style={styles.accountIcon}>
              <Ionicons
                name="person-outline"
                size={22}
                color={colors.navy}
              />
            </View>

            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>
                Store Profile & Security
              </Text>

              <Text style={styles.itemDescription}>
                Manage your store information and security
              </Text>
            </View>

            <View style={styles.arrowContainer}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.navy}
              />
            </View>
          </Pressable>

          <View style={styles.goldLine} />

          <View style={styles.accountHint}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={colors.textMuted}
            />

            <Text style={styles.accountHintText}>
              Keep your store information up to date.
            </Text>
          </View>
        </Card>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="cloud-upload-outline"
              size={17}
              color={colors.gold}
            />
          </View>

          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>Optional Cloud Backup</Text>
            <Text style={styles.sectionSubtitle}>
              SQLite stays on this device as your source of truth
            </Text>
          </View>
        </View>

        <Card style={styles.cloudCard}>
          <View style={styles.cloudHeading}>
            <Ionicons
              name="cloud-outline"
              size={24}
              color={colors.navy}
            />
            <View style={styles.cloudCopy}>
              <Text style={styles.cloudTitle}>
                {linkedFirebaseUidForUser &&
                cloudUser?.uid === linkedFirebaseUidForUser
                  ? "Email/Password connected"
                  : "Cloud backup is off"}
              </Text>
              <Text style={styles.cloudDescription}>
                {(linkedFirebaseUidForUser &&
                cloudUser?.uid === linkedFirebaseUidForUser
                  ? cloudUser.email
                  : null) ||
                  "Connect an optional Firebase account to back up your store data."}
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.cloudButton,
              pressed && styles.cloudButtonPressed,
              cloudCancelPending && styles.cloudButtonDisabled,
            ]}
            onPress={handleCloudBackup}
            disabled={cloudCancelPending}
          >
            <Ionicons
              name={
                cloudOperationActive
                  ? "close-circle-outline"
                  : linkedFirebaseUidForUser &&
                cloudUser?.uid === linkedFirebaseUidForUser
                  ? "cloud-upload-outline"
                  : "link-outline"
              }
              size={18}
              color={colors.white}
            />
            <Text style={styles.cloudButtonText}>
              {cloudCancelPending
                ? "Cancelling backup..."
                : cloudOperationActive
                ? "Cancel backup"
                : cloudUser &&
                  linkedFirebaseUidForUser === cloudUser.uid
                  ? "Back up now"
                  : "Connect and back up"}
            </Text>
          </Pressable>
          {linkedFirebaseUidForUser && (
            <Pressable
              style={styles.cloudChangeAccount}
              onPress={() => {
                setCloudEmail("");
                setCloudPassword("");
                setCloudFeedback(null);
                setCloudModalVisible(true);
              }}
              disabled={cloudOperationActive}
            >
              <Text style={styles.cloudChangeAccountText}>
                Change linked email profile
              </Text>
            </Pressable>
          )}
          <View style={styles.backupSchedule}>
            <Text style={styles.backupScheduleTitle}>
              Automatic backup frequency
            </Text>
            <View style={styles.backupScheduleOptions}>
              {[
                { label: "8 hours", value: "8" },
                { label: "12 hours", value: "12" },
                { label: "Custom", value: "custom" },
              ].map((option) => {
                const selected = backupSchedule === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.backupScheduleOption,
                      selected && styles.backupScheduleOptionSelected,
                    ]}
                    onPress={() => setBackupSchedule(option.value)}
                    disabled={backupScheduleLoading}
                  >
                    <Text
                      style={[
                        styles.backupScheduleOptionText,
                        selected && styles.backupScheduleOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {backupSchedule === "custom" && (
              <TextInput
                value={customBackupHours}
                onChangeText={setCustomBackupHours}
                keyboardType="decimal-pad"
                placeholder="Enter hours (minimum 1)"
                placeholderTextColor={colors.textMuted}
                editable={!backupScheduleLoading}
                style={styles.backupScheduleInput}
              />
            )}
            <Text style={styles.cloudFootnote}>
              {backupScheduleLoading
                ? "Loading backup preference..."
                : !backupFrequencyValid
                ? "Enter a custom interval of at least 1 hour."
                : `Selected frequency: every ${backupFrequencyHours} hour${
                    backupFrequencyHours === 1 ? "" : "s"
                  }. ${
                    backupFrequencyDirty
                      ? "Save frequency to apply this choice."
                      : "This is the active schedule."
                  } Backups run while the app is active; if closed or offline, they are attempted when the app returns with a connection.`}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.backupFrequencySave,
                (!backupFrequencyDirty ||
                  !backupFrequencyValid ||
                  backupFrequencySaving ||
                  backupScheduleLoading) &&
                  styles.cloudButtonDisabled,
                pressed &&
                  backupFrequencyDirty &&
                  backupFrequencyValid &&
                  styles.cloudButtonPressed,
              ]}
              onPress={saveBackupFrequency}
              disabled={
                !backupFrequencyDirty ||
                !backupFrequencyValid ||
                backupFrequencySaving ||
                backupScheduleLoading
              }
            >
              <Text style={styles.backupFrequencySaveText}>
                {backupFrequencySaving
                  ? "Saving frequency..."
                  : backupFrequencyDirty
                  ? "Save frequency"
                  : "Frequency saved"}
              </Text>
            </Pressable>
            {backupFrequencyFeedback && (
              <Text
                accessibilityRole={
                  backupFrequencyFeedback.type === "error"
                    ? "alert"
                    : undefined
                }
                style={
                  backupFrequencyFeedback.type === "error"
                    ? styles.cloudError
                    : styles.cloudStatus
                }
              >
                {backupFrequencyFeedback.message}
              </Text>
            )}
          </View>
          <Text style={styles.cloudFootnote}>
            Backups are one-way. They do not replace local data or restore data to another device.
          </Text>
          {cloudFeedback && !cloudModalVisible && (
            <Text
              accessibilityRole="alert"
              style={
                cloudFeedback.type === "error"
                  ? styles.cloudError
                  : styles.cloudStatus
              }
            >
              {cloudFeedback.message}
            </Text>
          )}
          {cloudSyncState.status === "queued" && (
            <Text style={styles.cloudStatus}>Cloud backup queued…</Text>
          )}
          {cloudSyncState.status === "syncing" && (
            <Text style={styles.cloudStatus}>Backing up local changes…</Text>
          )}
          {cloudSyncState.status === "cancelling" && (
            <Text style={styles.cloudStatus}>Stopping after the current upload…</Text>
          )}
          {cloudSyncState.status === "cancelled" && (
            <Text style={styles.cloudStatus}>
              Backup cancelled. Any batches already uploaded remain in the cloud.
            </Text>
          )}
          {cloudSyncState.status === "synced" && (
            <Text style={styles.cloudStatus}>
              Last backup: {new Date(cloudSyncState.backedUpAt).toLocaleString()}
            </Text>
          )}
          {cloudSyncState.status === "failed" && (
            <View>
              <Text style={styles.cloudError}>
                Local data is saved, but cloud backup failed: {cloudSyncState.message}
              </Text>
              <Pressable
                onPress={() => {
                  if (user?.id) {
                    retryCloudSync(db, user.id);
                  }
                }}
                disabled={cloudBusy}
                style={styles.cloudRetry}
              >
                <Text style={styles.cloudRetryText}>Retry cloud backup</Text>
              </Pressable>
            </View>
          )}
        </Card>

        {/* =========================
            APP INFORMATION
        ========================= */}

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="settings-outline"
              size={17}
              color={colors.gold}
            />
          </View>

          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>
              App Information
            </Text>

            <Text style={styles.sectionSubtitle}>
              Track&Tally system details
            </Text>
          </View>
        </View>

        <Card style={styles.infoCard}>
          {/* VERSION */}

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="phone-portrait-outline"
                size={21}
                color={colors.navy}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                App Version
              </Text>

              <Text style={styles.infoDescription}>
                Current application version
              </Text>
            </View>

            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>
                1.0.0
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          {/* DATABASE */}

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="server-outline"
                size={21}
                color={colors.navy}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                Database Engine
              </Text>

              <Text style={styles.infoDescription}>
                Local store data storage
              </Text>
            </View>

            <View style={styles.databaseBadge}>
              <View style={styles.databaseDot} />

              <Text style={styles.databaseText}>
                SQLite
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          {/* SECURITY */}

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={colors.navy}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                Account Security
              </Text>

              <Text style={styles.infoDescription}>
                Your store account is protected
              </Text>
            </View>

            <View style={styles.secureBadge}>
              <Ionicons
                name="checkmark"
                size={13}
                color={colors.success}
              />

              <Text style={styles.secureText}>
                Secure
              </Text>
            </View>
          </View>
        </Card>

        {/* =========================
            SECURITY & LOGOUT
        ========================= */}

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconRed}>
            <Ionicons
              name="shield-outline"
              size={17}
              color={colors.danger}
            />
          </View>

          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>
              Security
            </Text>

            <Text style={styles.sectionSubtitle}>
              Protect your store account
            </Text>
          </View>
        </View>

        {/* LOGOUT CARD */}

        <View style={styles.logoutCard}>
          <View style={styles.logoutAccent} />

          <View style={styles.logoutTop}>
            <View style={styles.logoutIconOuter}>
              <View style={styles.logoutIconInner}>
                <Ionicons
                  name="log-out-outline"
                  size={25}
                  color={colors.danger}
                />
              </View>
            </View>

            <View style={styles.logoutTitleContainer}>
              <Text style={styles.logoutTitle}>
                Log Out
              </Text>

              <Text style={styles.logoutSubtitle}>
                End your current store session
              </Text>
            </View>
          </View>

          <View style={styles.logoutMessage}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={colors.textMuted}
            />

            <Text style={styles.logoutMessageText}>
              You can log back in anytime using your
              store account credentials.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={openLogoutModal}
          >
            <View style={styles.logoutButtonIcon}>
              <Ionicons
                name="log-out"
                size={19}
                color={colors.white}
              />
            </View>

            <Text style={styles.logoutButtonText}>
              Log Out of Account
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color={colors.white}
            />
          </Pressable>
        </View>

        {/* =========================
            FOOTER
        ========================= */}

        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons
              name="storefront-outline"
              size={16}
              color={colors.gold}
            />

            <Text style={styles.footerBrand}>
              Track&Tally
            </Text>
          </View>

          <Text style={styles.footerText}>
            Simple Store Management
          </Text>

          <View style={styles.footerLine} />

          <Text style={styles.footerVersion}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* =========================
          LOGOUT CONFIRMATION MODAL
      ========================= */}

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeLogoutModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeLogoutModal}
          />

          <View style={styles.logoutModal}>
            {/* GOLD TOP ACCENT */}

            <View style={styles.modalGoldAccent} />

            {/* MODAL ICON */}

            <View style={styles.modalIconOuter}>
              <View style={styles.modalIconInner}>
                <Ionicons
                  name="log-out-outline"
                  size={31}
                  color={colors.danger}
                />
              </View>
            </View>

            {/* SMALL LABEL */}

            <View style={styles.modalLabel}>
              <Ionicons
                name="shield-outline"
                size={13}
                color={colors.gold}
              />

              <Text style={styles.modalLabelText}>
                ACCOUNT SECURITY
              </Text>
            </View>

            {/* TITLE */}

            <Text style={styles.modalTitle}>
              Log Out?
            </Text>

            {/* MESSAGE */}

            <Text style={styles.modalMessage}>
              Are you sure you want to log out of your
              Track&Tally store account?
            </Text>

            {/* ACCOUNT PREVIEW */}

            <View style={styles.accountPreview}>
              <View style={styles.previewIcon}>
                <Ionicons
                  name="storefront"
                  size={20}
                  color={colors.gold}
                />
              </View>

              <View style={styles.previewContent}>
                <Text style={styles.previewLabel}>
                  CURRENT STORE
                </Text>

                <Text
                  style={styles.previewStoreName}
                  numberOfLines={1}
                >
                  {user?.storeName || "My Store"}
                </Text>

                <Text style={styles.previewPhone}>
                  {user?.phoneNumber || "No phone number"}
                </Text>
              </View>

              <View style={styles.activePreview}>
                <View style={styles.previewDot} />

                <Text style={styles.previewActiveText}>
                  ACTIVE
                </Text>
              </View>
            </View>

            {/* WARNING MESSAGE */}

            <View style={styles.modalWarning}>
              <View style={styles.modalWarningIcon}>
                <Ionicons
                  name="information-circle"
                  size={17}
                  color={colors.gold}
                />
              </View>

              <Text style={styles.modalWarningText}>
                Your local store data will remain saved.
                You can log in again later.
              </Text>
            </View>

            {/* BUTTONS */}

            <View style={styles.modalActions}>
              {/* CANCEL */}

              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
                ]}
                onPress={closeLogoutModal}
              >
                <Ionicons
                  name="close-outline"
                  size={19}
                  color={colors.navy}
                />

                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </Pressable>

              {/* LOG OUT */}

              <Pressable
                style={({ pressed }) => [
                  styles.confirmLogoutButton,
                  pressed &&
                    styles.confirmLogoutButtonPressed,
                ]}
                onPress={handleLogout}
              >
                <Ionicons
                  name="log-out-outline"
                  size={19}
                  color={colors.white}
                />

                <Text style={styles.confirmLogoutText}>
                  Log Out
                </Text>
              </Pressable>
            </View>

            {/* BOTTOM GOLD LINE */}

            <View style={styles.modalBottomGoldLine} />
          </View>
        </View>
      </Modal>
      <Modal
        visible={cloudModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (cloudBusy) cancelCloudBackup();
          else setCloudModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cloudModal}>
            <Text style={styles.cloudModalTitle}>
              {linkedFirebaseUidForUser
                ? "Change cloud backup profile"
                : "Connect cloud backup"}
            </Text>
            <Text style={styles.cloudModalMessage}>
              {linkedFirebaseUidForUser
                ? "Sign in with another Firebase email to switch this store's backup destination. Your previous cloud backup is not deleted. This does not change your local PIN."
                : "Use Firebase Email/Password. This does not change your local PIN."}
            </Text>
            {cloudFeedback?.type === "error" && (
              <Text accessibilityRole="alert" style={styles.cloudError}>
                {cloudFeedback.message}
              </Text>
            )}
            <TextInput
              value={cloudEmail}
              onChangeText={setCloudEmail}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!cloudBusy}
              style={styles.cloudInput}
            />
            <TextInput
              value={cloudPassword}
              onChangeText={setCloudPassword}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="password"
              editable={!cloudBusy}
              style={styles.cloudInput}
            />
            <Pressable
              style={[styles.cloudButton, cloudBusy && styles.cloudButtonDisabled]}
              onPress={() => handleCloudAuth("signin")}
              disabled={cloudBusy}
            >
              <Text style={styles.cloudButtonText}>
                {cloudBusy ? "Please wait..." : "Sign in and back up"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.cloudButton,
                styles.cloudCreateButton,
                cloudBusy && styles.cloudButtonDisabled,
              ]}
              onPress={() => handleCloudAuth("create")}
              disabled={cloudBusy}
            >
              <Text style={styles.cloudCreateButtonText}>
                Create account and back up
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (cloudBusy) cancelCloudBackup();
                else setCloudModalVisible(false);
              }}
              style={styles.cloudCancel}
            >
              <Text style={styles.cloudCancelText}>
                {cloudBusy
                  ? cloudCancelPending
                    ? "Cancelling..."
                    : "Cancel backup"
                  : "Cancel"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getCloudBackupSummary(result) {
  return `Backup complete: ${result.debtors} debtors, ${result.products} products, ${result.sales} sales, and ${result.transactions} transactions uploaded.`;
}

function createCloudBackupCancelledError() {
  const error = new Error("Cloud backup was cancelled.");
  error.code = "cloud-sync/cancelled";
  return error;
}

function throwIfCloudBackupCancelled(cancelRef) {
  if (cancelRef.current) {
    throw createCloudBackupCancelledError();
  }
}

function getCloudErrorMessage(error) {
  if (error?.code === "cloud-sync/cancelled") {
    return "Backup cancelled. Any batches already uploaded remain in the cloud.";
  }
  const messages = {
    "auth/email-already-in-use":
      "That email already has a Firebase account. Choose Sign in instead.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Choose a stronger password (at least 6 characters).",
    "auth/invalid-credential":
      "Email or password is incorrect. Check your details and try again.",
    "auth/user-not-found":
      "No Firebase account was found for that email. Create an account first.",
    "auth/wrong-password":
      "Email or password is incorrect. Check your details and try again.",
    "auth/operation-not-allowed":
      "Email/Password sign-in is disabled. Enable it in Firebase Authentication settings.",
    "auth/network-request-failed":
      "Could not reach Firebase. Check your internet connection and retry.",
    "auth/too-many-requests":
      "Firebase temporarily blocked sign-in attempts. Wait a bit, then retry.",
    "permission-denied":
      "Firestore denied this backup. Publish the owner-only rules in firestore.rules.",
    "firestore/permission-denied":
      "Firestore denied this backup. Publish the owner-only rules in firestore.rules.",
  };
  const code = error?.code;
  if (code && messages[code]) return messages[code];
  return error?.message || "Could not connect or back up. Please try again.";
}

const styles = StyleSheet.create({
  /* =========================
     SCREEN
  ========================= */

  safe: {
    flex: 1,
    backgroundColor: colors.navy,
  },

  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 125,
    backgroundColor: colors.cream,
    flexGrow: 1,
  },

  /* =========================
     PROFILE HERO
  ========================= */

  profileHero: {
    backgroundColor: colors.navy,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    overflow: "hidden",

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 7,
  },

  profileGlow: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -70,
    top: -75,
    backgroundColor: colors.navyDark,
    opacity: 0.9,
  },

  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  storeIconOuter: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(201,162,75,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201,162,75,0.35)",
  },

  storeIconInner: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.navyDark,
    alignItems: "center",
    justifyContent: "center",
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46,125,91,0.18)",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 6,
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: colors.success,
  },

  activeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9BE0BC",
    letterSpacing: 0.8,
  },

  profileWelcome: {
    marginTop: 22,
    fontSize: 11,
    fontWeight: "600",
    color: colors.goldLight,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  storeName: {
    marginTop: 5,
    fontSize: 23,
    fontWeight: "800",
    color: colors.white,
  },

  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 7,
  },

  phoneText: {
    fontSize: 13,
    color: "#D8DFE8",
  },

  profileDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 18,
  },

  profileFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  profileFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  profileFooterText: {
    fontSize: 11,
    color: "#D8DFE8",
    fontWeight: "600",
  },

  /* =========================
     SECTION HEADER
  ========================= */

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
    marginTop: 2,
  },

  sectionIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#F1E7C8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionIconRed: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#FDEEEE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionHeadingText: {
    flex: 1,
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
     ACCOUNT CARD
  ========================= */

  accountCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 19,
    marginBottom: 24,
  },

  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },

  itemPressed: {
    backgroundColor: "#F7F4EA",
  },

  accountIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  itemContent: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },

  itemDescription: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },

  arrowContainer: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#F4F6F8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  goldLine: {
    height: 2,
    backgroundColor: colors.gold,
    marginHorizontal: 15,
    opacity: 0.65,
  },

  accountHint: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 7,
  },

  accountHintText: {
    flex: 1,
    fontSize: 10,
    color: colors.textMuted,
  },

  /* =========================
     APP INFORMATION
  ========================= */

  infoCard: {
    paddingHorizontal: 15,
    paddingVertical: 3,
    borderRadius: 19,
    marginBottom: 24,
  },

  cloudCard: {
    padding: 16,
    borderRadius: 19,
    marginBottom: 24,
  },

  cloudHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  cloudCopy: {
    flex: 1,
  },

  cloudTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },

  cloudDescription: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },

  cloudButton: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.navy,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  cloudButtonPressed: {
    opacity: 0.85,
  },

  cloudButtonDisabled: {
    opacity: 0.55,
  },

  cloudButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },

  cloudChangeAccount: {
    alignSelf: "flex-start",
    paddingVertical: 9,
  },

  cloudChangeAccountText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "800",
  },

  backupSchedule: {
    marginTop: 16,
    gap: 9,
  },

  backupScheduleTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },

  backupScheduleOptions: {
    flexDirection: "row",
    gap: 7,
  },

  backupScheduleOption: {
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.cream,
    paddingHorizontal: 5,
  },

  backupScheduleOptionSelected: {
    borderColor: colors.navy,
    backgroundColor: colors.navy,
  },

  backupScheduleOptionText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },

  backupScheduleOptionTextSelected: {
    color: colors.white,
  },

  backupScheduleInput: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 12,
  },

  backupFrequencySave: {
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    marginTop: 2,
  },

  backupFrequencySaveText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },

  cloudFootnote: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
  },

  cloudStatus: {
    color: colors.success,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },

  cloudError: {
    color: colors.danger,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },

  cloudRetry: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },

  cloudRetryText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "800",
  },

  cloudModal: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    backgroundColor: colors.white,
  },

  cloudModalTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "800",
  },

  cloudModalMessage: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },

  cloudInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    color: colors.text,
    marginBottom: 10,
  },

  cloudCreateButton: {
    marginTop: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.navy,
  },

  cloudCreateButtonText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
  },

  cloudCancel: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  cloudCancelText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
  },

  infoIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },

  infoDescription: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 4,
  },

  versionBadge: {
    backgroundColor: "#F7F4EA",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },

  versionText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.navy,
  },

  databaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EDF7F1",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.full,
  },

  databaseDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: colors.success,
  },

  databaseText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.success,
  },

  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDF7F1",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.full,
  },

  secureText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.success,
  },

  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  /* =========================
     LOGOUT / SECURITY
  ========================= */

  logoutCard: {
    backgroundColor: colors.white,
    borderRadius: 21,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1D7D7",
    overflow: "hidden",

    shadowColor: "#B3413B",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  logoutAccent: {
    height: 3,
    backgroundColor: colors.danger,
    borderRadius: 3,
    marginBottom: 16,
    opacity: 0.85,
  },

  logoutTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoutIconOuter: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FDEEEE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F7D5D5",
    marginRight: 12,
  },

  logoutIconInner: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFF7F7",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutTitleContainer: {
    flex: 1,
  },

  logoutTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.danger,
  },

  logoutSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },

  logoutMessage: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 11,
    marginTop: 15,
    gap: 7,
  },

  logoutMessageText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 16,
    color: colors.textMuted,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 51,
    backgroundColor: colors.danger,
    borderRadius: 14,
    paddingHorizontal: 13,
    marginTop: 15,

    shadowColor: colors.danger,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 3,
  },

  logoutButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  logoutButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  logoutButtonText: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  /* =========================
     FOOTER
  ========================= */

  footer: {
    alignItems: "center",
    paddingTop: 26,
    paddingBottom: 8,
  },

  footerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  footerBrand: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
  },

  footerText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },

  footerLine: {
    width: 45,
    height: 2,
    backgroundColor: colors.gold,
    borderRadius: 2,
    marginVertical: 9,
    opacity: 0.7,
  },

  footerVersion: {
    fontSize: 9,
    color: colors.textMuted,
  },

  /* =========================
     LOGOUT MODAL
  ========================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20,42,69,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  logoutModal: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 26,
    padding: 20,
    alignItems: "center",
    overflow: "hidden",

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 12,
  },

  modalGoldAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: colors.gold,
  },

  modalIconOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#FDEEEE",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F5D6D6",
  },

  modalIconInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFF7F7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F7DADA",
  },

  modalLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: "#F7F4EA",
  },

  modalLabelText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.gold,
    letterSpacing: 1,
  },

  modalTitle: {
    marginTop: 9,
    fontSize: 23,
    fontWeight: "800",
    color: colors.navy,
    textAlign: "center",
  },

  modalMessage: {
    marginTop: 7,
    paddingHorizontal: 10,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: "center",
  },

  accountPreview: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },

  previewIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  previewContent: {
    flex: 1,
  },

  previewLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.8,
  },

  previewStoreName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 2,
  },

  previewPhone: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 2,
  },

  activePreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: "#EDF7F1",
    gap: 4,
    marginLeft: 5,
  },

  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: colors.success,
  },

  previewActiveText: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.success,
  },

  modalWarning: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 10,
    borderRadius: 13,
    backgroundColor: "#FFF8E8",
    borderWidth: 1,
    borderColor: "#F2E0AA",
    gap: 8,
  },

  modalWarningIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#F9E9B9",
    alignItems: "center",
    justifyContent: "center",
  },

  modalWarningText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 14,
    color: "#806719",
  },

  modalActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  cancelButtonPressed: {
    backgroundColor: "#F7F4EA",
    transform: [{ scale: 0.98 }],
  },

  cancelButtonText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.navy,
  },

  confirmLogoutButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,

    shadowColor: colors.danger,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 4,
  },

  confirmLogoutButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },

  confirmLogoutText: {
    color: colors.white,
    fontSize: 12.5,
    fontWeight: "800",
  },

  modalBottomGoldLine: {
    width: 45,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.gold,
    marginTop: 17,
    opacity: 0.8,
  },
});
