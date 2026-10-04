import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useMemo } from "react";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";

import Card from "@/components/Card";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";

import {
  colors,
  spacing,
  typography,
  radius,
} from "@/constants/theme";

import {
  formatCurrency,
  formatDateTime,
} from "@/lib/format";

import {
  getDebtor,
  getTransactionsForDebtor,
  deleteTransaction,
  deleteDebtor,
} from "@/db/database";
import { useAuth } from "@/context/AuthContext";

export default function DebtorDetailScreen() {
  const { id } = useLocalSearchParams();
  const debtorId = Number(id);

  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();

  const [debtor, setDebtor] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const runningBalances = useMemo(() => {
    const balances = new Map();
    let running = 0;

    [...transactions]
      .sort((a, b) => {
        const dateDiff =
          new Date(a.created_at) -
          new Date(b.created_at);

        return dateDiff || a.id - b.id;
      })
      .forEach((tx) => {
        running +=
          tx.type === "credit"
            ? tx.amount
            : -tx.amount;

        balances.set(tx.id, running);
      });

    return balances;
  }, [transactions]);

const load = useCallback(async () => {
  if (!debtorId) return;

  const [d, tx] = await Promise.all([
      getDebtor(db, debtorId),
      getTransactionsForDebtor(db, debtorId),
    ]);

    setDebtor(d);
    setTransactions(tx);
  }, [db, debtorId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleDeleteTx(txId) {
    Alert.alert(
      "Remove entry",
      "Delete this transaction? This will update the balance.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTransaction(db, user?.id, txId);
            load();
          },
        },
      ]
    );
  }

  async function handleDeleteDebtor() {
    if ((debtor?.balance ?? 0) > 0) {
      Alert.alert(
        "May utang pa",
        `${debtor.full_name} still has an outstanding balance of ${formatCurrency(
          debtor.balance
        )}. Settle it before removing this debtor.`
      );

      return;
    }

    Alert.alert(
      "Remove debtor",
      `Remove ${debtor?.full_name} and all their records?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteDebtor(db, user?.id, debtorId);
            router.back();
          },
        },
      ]
    );
  }

  if (!debtor) return null;

  const hasBalance = debtor.balance > 0;

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
            styles.backButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.navy}
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>
            DEBTOR PROFILE
          </Text>

          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {debtor.full_name}
          </Text>
        </View>

        <Pressable
          onPress={handleDeleteDebtor}
          hitSlop={12}
          style={({ pressed }) => [
            styles.deleteHeaderButton,
            pressed && styles.deleteHeaderPressed,
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={19}
            color={colors.danger}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* =====================================================
            PROFILE HERO
        ===================================================== */}

        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroTop}>
            <View style={styles.avatarWrapper}>
              {debtor.profile_photo_uri ? (
                <Image
                  source={{
                    uri: debtor.profile_photo_uri,
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={34}
                    color={colors.goldLight}
                  />
                </View>
              )}

              <View
                style={[
                  styles.avatarStatus,
                  {
                    backgroundColor: hasBalance
                      ? colors.danger
                      : colors.success,
                  },
                ]}
              >
                <Ionicons
                  name={
                    hasBalance
                      ? "alert"
                      : "checkmark"
                  }
                  size={10}
                  color={colors.white}
                />
              </View>
            </View>

            <View style={styles.heroInfo}>
              <View style={styles.heroBadge}>
                <View
                  style={[
                    styles.heroBadgeDot,
                    {
                      backgroundColor: hasBalance
                        ? colors.danger
                        : colors.success,
                    },
                  ]}
                />

                <Text style={styles.heroBadgeText}>
                  {hasBalance
                    ? "OUTSTANDING"
                    : "SETTLED"}
                </Text>
              </View>

              <Text
                style={styles.heroName}
                numberOfLines={2}
              >
                {debtor.full_name}
              </Text>

              <Text style={styles.heroSubtext}>
                Customer account
              </Text>
            </View>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/debtors/edit",
                  params: {
                    debtorId: String(debtorId),
                  },
                })
              }
              style={({ pressed }) => [
                styles.heroEditButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={colors.navy}
              />
            </Pressable>
          </View>

          {/* Balance */}

          <View style={styles.heroDivider} />

          <View style={styles.balanceArea}>
            <Text style={styles.balanceLabel}>
              CURRENT BALANCE
            </Text>

            <Text
              style={[
                styles.balanceValue,
                {
                  color: hasBalance
                    ? colors.danger
                    : colors.success,
                },
              ]}
            >
              {formatCurrency(debtor.balance)}
            </Text>

            <View style={styles.balanceStatus}>
              <Ionicons
                name={
                  hasBalance
                    ? "time-outline"
                    : "checkmark-circle-outline"
                }
                size={13}
                color={
                  hasBalance
                    ? colors.danger
                    : colors.success
                }
              />

              <Text
                style={[
                  styles.balanceStatusText,
                  {
                    color: hasBalance
                      ? colors.danger
                      : colors.success,
                  },
                ]}
              >
                {hasBalance
                  ? "Outstanding amount"
                  : "No outstanding balance"}
              </Text>
            </View>
          </View>
        </View>

        {/* =====================================================
            QUICK ACTIONS
        ===================================================== */}

        <View style={styles.quickActionsSection}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionHeadingIcon}>
              <Ionicons
                name="flash-outline"
                size={17}
                color={colors.navy}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Quick actions
              </Text>

              <Text style={styles.sectionSubtitle}>
                Manage this customer account
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            {/* CREDIT SALE */}

            <Pressable
              onPress={() =>
                router.push({
                  pathname:
                    "/debtors/add-credit",
                  params: {
                    debtorId:
                      String(debtorId),
                  },
                })
              }
              style={({ pressed }) => [
                styles.actionCard,
                styles.creditAction,
                pressed &&
                  styles.actionCardPressed,
              ]}
            >
              <View style={styles.actionIconGold}>
                <Ionicons
                  name="cart-outline"
                  size={21}
                  color={colors.navy}
                />
              </View>

              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>
                  Log credit sale
                </Text>

                <Text style={styles.actionSubtitle}>
                  Add new purchase
                </Text>
              </View>

              <View style={styles.actionArrow}>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.navy}
                />
              </View>
            </Pressable>

            {/* RECORD PAYMENT */}

            <Pressable
              onPress={() =>
                router.push({
                  pathname:
                    "/debtors/add-payment",
                  params: {
                    debtorId:
                      String(debtorId),
                  },
                })
              }
              style={({ pressed }) => [
                styles.actionCard,
                styles.paymentAction,
                pressed &&
                  styles.actionCardPressed,
              ]}
            >
              <View style={styles.actionIconNavy}>
                <Ionicons
                  name="cash-outline"
                  size={21}
                  color={colors.goldLight}
                />
              </View>

              <View style={styles.actionText}>
                <Text
                  style={[
                    styles.actionTitle,
                    styles.paymentActionText,
                  ]}
                >
                  Record payment
                </Text>

                <Text
                  style={[
                    styles.actionSubtitle,
                    styles.paymentActionSubtitle,
                  ]}
                >
                  Update payment
                </Text>
              </View>

              <View style={styles.actionArrowLight}>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.goldLight}
                />
              </View>
            </Pressable>
          </View>
        </View>

        {/* =====================================================
            PROFILE
        ===================================================== */}

        <View style={styles.contentSection}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionHeadingIcon}>
              <Ionicons
                name="person-outline"
                size={17}
                color={colors.navy}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Profile
              </Text>

              <Text style={styles.sectionSubtitle}>
                Customer information
              </Text>
            </View>
          </View>

          <Card style={styles.profileCard}>
            {debtor.id_photo_uri ? (
              <View style={styles.idPhotoContainer}>
                <Image
                  source={{
                    uri: debtor.id_photo_uri,
                  }}
                  style={styles.idPhoto}
                />

                <View style={styles.photoLabel}>
                  <Ionicons
                    name="shield-checkmark"
                    size={13}
                    color={colors.white}
                  />

                  <Text style={styles.photoLabelText}>
                    ID PHOTO
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noPhotoCard}>
                <View style={styles.noPhotoIcon}>
                  <Ionicons
                    name="image-outline"
                    size={22}
                    color={colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.noPhotoTitle}>
                    No ID photo
                  </Text>

                  <Text style={styles.noPhotoText}>
                    Add a photo from the edit profile page.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.infoList}>
              <InfoRow
                icon="card-outline"
                title="ID number"
                value={
                  debtor.id_number ||
                  "No ID number on file"
                }
              />

              <InfoRow
                icon="call-outline"
                title="Contact number"
                value={
                  debtor.contact_number ||
                  "No contact number"
                }
              />

              <InfoRow
                icon="location-outline"
                title="Address"
                value={
                  debtor.address ||
                  "No address on file"
                }
              />

              <InfoRow
                icon="wallet-outline"
                title="Credit limit"
                value={
                  debtor.credit_limit > 0
                    ? formatCurrency(
                        debtor.credit_limit
                      )
                    : "No credit limit"
                }
              />

              {debtor.notes ? (
                <InfoRow
                  icon="document-text-outline"
                  title="Notes"
                  value={debtor.notes}
                  last
                />
              ) : null}
            </View>
          </Card>
        </View>

        {/* =====================================================
            TRANSACTION HISTORY
        ===================================================== */}

        <View style={styles.contentSection}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionHeadingIcon}>
              <Ionicons
                name="receipt-outline"
                size={17}
                color={colors.navy}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Transaction history
              </Text>

              <Text style={styles.sectionSubtitle}>
                {transactions.length === 0
                  ? "No account activity yet"
                  : `${transactions.length} ${
                      transactions.length === 1
                        ? "transaction"
                        : "transactions"
                    }`}
              </Text>
            </View>

            {transactions.length > 0 && (
              <View style={styles.transactionCount}>
                <Text style={styles.transactionCountText}>
                  {transactions.length}
                </Text>
              </View>
            )}
          </View>

          <Card
            style={[
              styles.transactionsCard,
              transactions.length === 0 &&
                styles.emptyTransactionsCard,
            ]}
          >
            {transactions.length === 0 ? (
              <View style={styles.emptyStateWrapper}>
                <View style={styles.emptyIconOuter}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="receipt-outline"
                      size={29}
                      color={colors.goldLight}
                    />
                  </View>
                </View>

                <Text style={styles.emptyTitle}>
                  No transactions yet
                </Text>

                <Text style={styles.emptySubtitle}>
                  Credit sales and payments for this
                  customer will appear here.
                </Text>

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname:
                        "/debtors/add-credit",
                      params: {
                        debtorId:
                          String(debtorId),
                      },
                    })
                  }
                  style={({ pressed }) => [
                    styles.emptyAction,
                    pressed &&
                      styles.actionCardPressed,
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={17}
                    color={colors.navy}
                  />

                  <Text style={styles.emptyActionText}>
                    Log first credit sale
                  </Text>
                </Pressable>
              </View>
            ) : (
              transactions.map((tx, i) => {
                const isCredit =
                  tx.type === "credit";

                return (
                  <Pressable
                    key={tx.id}
                    onLongPress={() =>
                      handleDeleteTx(tx.id)
                    }
                    delayLongPress={450}
                    style={({ pressed }) => [
                      styles.txRow,
                      i !==
                        transactions.length - 1 &&
                        styles.txRowBorder,
                      pressed &&
                        styles.txRowPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.txIcon,
                        {
                          backgroundColor:
                            isCredit
                              ? "#B3413B12"
                              : "#2E7D5B12",
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isCredit
                            ? "arrow-up-outline"
                            : "arrow-down-outline"
                        }
                        size={18}
                        color={
                          isCredit
                            ? colors.danger
                            : colors.success
                        }
                      />
                    </View>

                    <View style={styles.txMain}>
                      <View style={styles.txTitleRow}>
                        <Text
                          style={styles.txName}
                          numberOfLines={1}
                        >
                          {isCredit
                            ? "Credit purchase"
                            : "Payment received"}
                        </Text>

                        <View
                          style={[
                            styles.typeBadge,
                            {
                              backgroundColor:
                                isCredit
                                  ? "#B3413B10"
                                  : "#2E7D5B10",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeBadgeText,
                              {
                                color: isCredit
                                  ? colors.danger
                                  : colors.success,
                              },
                            ]}
                          >
                            {isCredit
                              ? "CREDIT"
                              : "PAYMENT"}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={styles.txMeta}
                        numberOfLines={2}
                      >
                        {[
                          formatPaymentMethod(tx),
                          tx.payment_reference
                            ? `Reference: ${tx.payment_reference}`
                            : null,
                          tx.description,
                          formatDateTime(tx.created_at),
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </Text>
                    </View>

                    <View style={styles.txBalanceCol}>
                      <Text
                        style={[
                          styles.txAmount,
                          {
                            color: isCredit
                              ? colors.danger
                              : colors.success,
                          },
                        ]}
                      >
                        {isCredit ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </Text>

                      <Text
                        style={
                          styles.runningBalance
                        }
                      >
                        Bal:{" "}
                        {formatCurrency(
                          runningBalances.get(
                            tx.id
                          ) ?? 0
                        )}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Card>

          {transactions.length > 0 && (
            <View style={styles.hintCard}>
              <View style={styles.hintIcon}>
                <Ionicons
                  name="finger-print-outline"
                  size={15}
                  color={colors.goldLight}
                />
              </View>

              <Text style={styles.hint}>
                Press and hold a transaction to remove it.
              </Text>
            </View>
          )}
        </View>

        {/* =====================================================
            ACCOUNT FOOTER
        ===================================================== */}

        <View style={styles.footerCard}>
          <View style={styles.footerIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={colors.success}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.footerTitle}>
              Account information
            </Text>

            <Text style={styles.footerText}>
              This debtor data is stored locally
              in Track&Tally.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function formatPaymentMethod(transaction) {
  if (transaction.type !== "payment") return null;

  if (transaction.payment_method === "e_wallet") {
    return transaction.payment_provider
      ? `E-wallet: ${transaction.payment_provider}`
      : "E-wallet";
  }

  if (transaction.payment_method === "e_banking") {
    return "E-banking";
  }

  return transaction.payment_method === "cash" ? "Cash" : null;
}

function InfoRow({
  icon,
  title,
  value,
  last = false,
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && styles.infoRowBorder,
      ]}
    >
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={17}
          color={colors.navy}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>
          {title}
        </Text>

        <Text style={styles.infoValue}>
          {value}
        </Text>
      </View>
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

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 7,
    paddingBottom: 12,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: "#142C4A10",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },

  headerEyebrow: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.6,
    color: colors.goldDark,
    marginBottom: 2,
  },

  title: {
    ...typography.heading,
    fontSize: 16,
    color: colors.navy,
    fontWeight: "900",
  },

  deleteHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B3413B0D",
    borderWidth: 1,
    borderColor: "#B3413B25",
  },

  deleteHeaderPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.9 }],
  },

  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },

  /* CONTAINER */

  container: {
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    gap: 19,
    paddingBottom:spacing.lg,
  },

  /* HERO */

  heroCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: colors.navy,
    borderRadius: 26,
    padding: 17,
    borderWidth: 1,
    borderColor: "#385775",
    shadowColor: colors.navy,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 9,
    },
    elevation: 8,
  },

  heroGlowOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#D9A92814",
    top: -135,
    right: -90,
  },

  heroGlowTwo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFFFFF06",
    bottom: -115,
    left: -90,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatarWrapper: {
    width: 72,
    height: 72,
    position: "relative",
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.goldLight,
  },

  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D9A92818",
    borderWidth: 1,
    borderColor: "#D9A92845",
  },

  avatarStatus: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.navy,
  },

  heroInfo: {
    flex: 1,
  },

  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#FFFFFF0C",
    borderWidth: 1,
    borderColor: "#FFFFFF18",
    marginBottom: 5,
  },

  heroBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  heroBadgeText: {
    fontSize: 6.5,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#FFFFFFB8",
  },

  heroName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },

  heroSubtext: {
    color: "#FFFFFF80",
    fontSize: 9.5,
    marginTop: 2,
  },

  heroEditButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.goldLight,
    shadowColor: colors.goldLight,
    shadowOpacity: 0.2,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },

  heroDivider: {
    height: 1,
    backgroundColor: "#FFFFFF16",
    marginVertical: 16,
  },

  balanceArea: {
    alignItems: "center",
  },

  balanceLabel: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: colors.goldLight,
  },

  balanceValue: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    marginTop: 3,
  },

  balanceStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },

  balanceStatusText: {
    fontSize: 9,
    fontWeight: "700",
  },

  /* SECTION HEADINGS */

  quickActionsSection: {
    gap: 11,
  },

  contentSection: {
    gap: 11,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  sectionHeadingIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.goldLight,
    shadowColor: colors.goldLight,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },

  sectionTitle: {
    ...typography.heading,
    fontSize: 14.5,
    color: colors.navy,
    fontWeight: "900",
  },

  sectionSubtitle: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* QUICK ACTIONS */

  actionsRow: {
    gap: 10,
  },

  actionCard: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: colors.navy,
    shadowOpacity: 0.07,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  creditAction: {
    backgroundColor: colors.goldLight,
    borderColor: "#E8C75D",
  },

  paymentAction: {
    backgroundColor: colors.navy,
    borderColor: "#385775",
  },

  actionIconGold: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF50",
  },

  actionIconNavy: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6a2b2b0c",
    borderWidth: 1,
    borderColor: "#FFFFFF18",
  },

  actionText: {
    flex: 1,
  },

  /* CREDIT SALE TEXT */

  actionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.navy,
  },

  actionSubtitle: {
    fontSize: 8.5,
    marginTop: 2,
    color: "#142C4A99",
  },

  /* RECORD PAYMENT TEXT */

  paymentActionText: {
    color: colors.white,
  },

  paymentActionSubtitle: {
    color: "#FFFFFF99",
  },

  actionArrow: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF50",
  },

  actionArrowLight: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF0C",
  },

  actionCardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.975 }],
  },

  /* PROFILE */

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  editButtonText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.navy,
  },

  profileCard: {
    padding: 13,
    gap: 13,
    borderRadius: 21,
    backgroundColor: colors.white,
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

  idPhotoContainer: {
    position: "relative",
    width: "100%",
    height: 190,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.border,
  },

  idPhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  photoLabel: {
    position: "absolute",
    left: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#071B2ACC",
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },

  photoLabelText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: colors.white,
  },

  noPhotoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 15,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },

  noPhotoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  noPhotoTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.navy,
  },

  noPhotoText: {
    fontSize: 8.5,
    color: colors.textMuted,
    marginTop: 2,
  },

  infoList: {
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 11,
    backgroundColor: colors.white,
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  infoIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: colors.textMuted,
    textTransform: "uppercase",
  },

  infoValue: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    color: colors.text,
    marginTop: 2,
  },

  /* TRANSACTIONS */

  transactionCount: {
    minWidth: 29,
    height: 29,
    paddingHorizontal: 7,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
  },

  transactionCountText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.goldLight,
  },

  transactionsCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOpacity: 0.055,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  emptyTransactionsCard: {
    minHeight: 275,
  },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },

  txRowPressed: {
    backgroundColor: colors.cream,
  },

  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  txIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  txMain: {
    flex: 1,
    minWidth: 0,
  },

  txTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  txName: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: "900",
    color: colors.text,
  },

  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRadius: 5,
  },

  typeBadgeText: {
    fontSize: 5.5,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  txMeta: {
    fontSize: 8.5,
    lineHeight: 13,
    color: colors.textMuted,
    marginTop: 3,
  },

  txBalanceCol: {
    alignItems: "flex-end",
    maxWidth: 105,
  },

  txAmount: {
    fontSize: 12,
    fontWeight: "900",
  },

  runningBalance: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 3,
  },

  /* EMPTY TRANSACTIONS */

  emptyStateWrapper: {
    flex: 1,
    minHeight: 270,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    paddingVertical: 25,
  },

  emptyIconOuter: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#110d0315",
    borderWidth: 1,
    borderColor: "#D9A92835",
    marginBottom: 12,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.navy,
  },

  emptySubtitle: {
    maxWidth: 270,
    textAlign: "center",
    fontSize: 9.5,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 5,
  },

  emptyAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: "#E8C75D",
    shadowColor: colors.goldLight,
    shadowOpacity: 0.2,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  emptyActionText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: colors.navy,
  },

  /* HINT */

  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    alignSelf: "center",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#D9A92810",
    borderWidth: 1,
    borderColor: "#D9A92825",
  },

  hintIcon: {
    width: 23,
    height: 23,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
  },

  hint: {
    fontSize: 8.5,
    color: colors.textMuted,
    fontWeight: "600",
  },

  /* FOOTER */

  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 17,
    backgroundColor: "#2E7D5B0A",
    borderWidth: 1,
    borderColor: "#2E7D5B20",
  },

  footerIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#263a3114",
  },

  footerTitle: {
    fontSize: 9.5,
    fontWeight: "900",
    color: colors.navy,
  },

  footerText: {
    fontSize: 8,
    lineHeight: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
