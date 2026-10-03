import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

import Card from "@/components/Card";
import { colors, spacing, radius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import TopHeader from "@/components/TopHeader";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

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
    </SafeAreaView>
  );
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