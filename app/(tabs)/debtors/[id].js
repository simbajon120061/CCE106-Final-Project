import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  useState,
  useCallback,
  useMemo,
} from "react";

import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { useSQLiteContext } from "expo-sqlite";

import { Ionicons } from "@expo/vector-icons";

import Card from "@/components/Card";

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

  const debtorId = String(id);

  const db = useSQLiteContext();

  const router = useRouter();

  const { user } = useAuth();

  const [debtor, setDebtor] = useState(null);

  const [transactions, setTransactions] = useState([]);

  /* =====================================================
     DELETE MODALS
  ===================================================== */

  const [deleteModalVisible, setDeleteModalVisible] =
    useState(false);

  const [debtWarningVisible, setDebtWarningVisible] =
    useState(false);

  const [deleting, setDeleting] = useState(false);

  /* =====================================================
     LOAD DEBTOR
  ===================================================== */

  const load = useCallback(async () => {
    if (!debtorId) return;

    try {
      const [d, tx] = await Promise.all([
        getDebtor(
          db,
          debtorId,
          user?.id
        ),

        getTransactionsForDebtor(
          db,
          debtorId,
          user?.id
        ),
      ]);

      setDebtor(d);

      setTransactions(tx || []);
    } catch (error) {
      console.error(
        "Load debtor error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to load debtor information."
      );
    }
  }, [db, debtorId, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* =====================================================
     RUNNING BALANCES
  ===================================================== */

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
            ? Number(tx.amount)
            : -Number(tx.amount);

        balances.set(
          tx.id,
          running
        );
      });

    return balances;
  }, [transactions]);

  /* =====================================================
     DELETE TRANSACTION
  ===================================================== */

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
            try {
              await deleteTransaction(
                db,
                user?.id,
                txId
              );

              await load();
            } catch (error) {
              console.error(
                "Delete transaction error:",
                error
              );

              Alert.alert(
                "Error",
                error?.message ||
                  "Failed to delete transaction."
              );
            }
          },
        },
      ]
    );
  }

  /* =====================================================
     OPEN DELETE MODAL
  ===================================================== */

  function handleDeleteDebtor() {
    if (!debtor) return;

    const balance = Number(
      debtor.balance || 0
    );

    /* ---------------------------------------------
       DO NOT ALLOW DELETE IF BALANCE IS POSITIVE
    --------------------------------------------- */

    if (balance > 0) {
      setDebtWarningVisible(true);
      return;
    }

    /* ---------------------------------------------
       OPEN CUSTOM CONFIRMATION MODAL
    --------------------------------------------- */

    setDeleteModalVisible(true);
  }

  /* =====================================================
     CONFIRM DELETE DEBTOR
  ===================================================== */

  async function confirmDeleteDebtor() {
    if (!debtor || deleting) return;

    try {
      setDeleting(true);

      /* ---------------------------------------------
         DELETE FROM DATABASE
      --------------------------------------------- */

      await deleteDebtor(
        db,
        debtorId,
        user?.id
      );

      /* ---------------------------------------------
         CLOSE MODAL
      --------------------------------------------- */

      setDeleteModalVisible(false);

      /* ---------------------------------------------
         SUCCESS MESSAGE
      --------------------------------------------- */

      Alert.alert(
        "Debtor Removed",
        `${debtor.full_name} has been removed from your debtor list. Their transaction history is retained in Reports.`,
        [
          {
            text: "OK",
            onPress: () => {
              router.replace(
                "/debtors"
              );
            },
          },
        ],
        {
          cancelable: false,
        }
      );
    } catch (error) {
      console.error(
        "Delete debtor error:",
        error
      );

      setDeleteModalVisible(false);

      Alert.alert(
        "Cannot Delete",
        error?.message ||
          "Failed to delete debtor. Please try again.",
        [
          {
            text: "OK",
          },
        ]
      );
    } finally {
      setDeleting(false);
    }
  }

  /* =====================================================
     CLOSE DELETE MODAL
  ===================================================== */

  function cancelDeleteDebtor() {
    if (deleting) return;

    setDeleteModalVisible(false);
  }

  /* =====================================================
     CLOSE DEBT WARNING MODAL
  ===================================================== */

  function closeDebtWarning() {
    setDebtWarningVisible(false);
  }

  /* =====================================================
     WAIT FOR DEBTOR
  ===================================================== */

  if (!debtor) {
    return null;
  }

  const hasBalance =
    Number(debtor.balance || 0) > 0;

  /* =====================================================
     RETURN UI
  ===================================================== */

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
            pressed &&
              styles.buttonPressed,
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

        {/* DELETE BUTTON */}

        <Pressable
          onPress={handleDeleteDebtor}
          disabled={deleting}
          hitSlop={12}
          style={({ pressed }) => [
            styles.deleteHeaderButton,

            pressed &&
              styles.deleteHeaderPressed,

            deleting &&
              styles.deleteDisabled,
          ]}
        >
          {deleting ? (
            <ActivityIndicator
              size="small"
              color={colors.danger}
            />
          ) : (
            <Ionicons
              name="trash-outline"
              size={19}
              color={colors.danger}
            />
          )}
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
                <View
                  style={
                    styles.avatarPlaceholder
                  }
                >
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
                    backgroundColor:
                      hasBalance
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
                      backgroundColor:
                        hasBalance
                          ? colors.danger
                          : colors.success,
                    },
                  ]}
                />

                <Text
                  style={
                    styles.heroBadgeText
                  }
                >
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

              <Text
                style={styles.heroSubtext}
              >
                Customer account
              </Text>
            </View>

            <Pressable
              onPress={() =>
                router.push({
                  pathname:
                    "/debtors/edit",
                  params: {
                    debtorId:
                      String(debtorId),
                  },
                })
              }
              style={({ pressed }) => [
                styles.heroEditButton,
                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={colors.navy}
              />
            </Pressable>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.balanceArea}>
            <Text
              style={styles.balanceLabel}
            >
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
              {formatCurrency(
                debtor.balance
              )}
            </Text>

            <View
              style={styles.balanceStatus}
            >
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

        <View
          style={styles.quickActionsSection}
        >
          <View
            style={styles.sectionHeading}
          >
            <View
              style={
                styles.sectionHeadingIcon
              }
            >
              <Ionicons
                name="flash-outline"
                size={17}
                color={colors.navy}
              />
            </View>

            <View>
              <Text
                style={styles.sectionTitle}
              >
                Quick actions
              </Text>

              <Text
                style={styles.sectionSubtitle}
              >
                Manage this customer account
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
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
              <View
                style={
                  styles.actionIconGold
                }
              >
                <Ionicons
                  name="cart-outline"
                  size={21}
                  color={colors.navy}
                />
              </View>

              <View style={styles.actionText}>
                <Text
                  style={styles.actionTitle}
                >
                  Log credit sale
                </Text>

                <Text
                  style={
                    styles.actionSubtitle
                  }
                >
                  Add new purchase
                </Text>
              </View>

              <View
                style={styles.actionArrow}
              >
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.navy}
                />
              </View>
            </Pressable>

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
              <View
                style={
                  styles.actionIconNavy
                }
              >
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

              <View
                style={
                  styles.actionArrowLight
                }
              >
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

        <View
          style={styles.contentSection}
        >
          <View
            style={styles.sectionHeading}
          >
            <View
              style={
                styles.sectionHeadingIcon
              }
            >
              <Ionicons
                name="person-outline"
                size={17}
                color={colors.navy}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={styles.sectionTitle}
              >
                Profile
              </Text>

              <Text
                style={styles.sectionSubtitle}
              >
                Customer information
              </Text>
            </View>
          </View>

          <Card
            style={styles.profileCard}
          >
            {debtor.id_photo_uri ? (
              <View
                style={
                  styles.idPhotoContainer
                }
              >
                <Image
                  source={{
                    uri: debtor.id_photo_uri,
                  }}
                  style={styles.idPhoto}
                />

                <View
                  style={styles.photoLabel}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={13}
                    color={colors.white}
                  />

                  <Text
                    style={
                      styles.photoLabelText
                    }
                  >
                    ID PHOTO
                  </Text>
                </View>
              </View>
            ) : (
              <View
                style={styles.noPhotoCard}
              >
                <View
                  style={styles.noPhotoIcon}
                >
                  <Ionicons
                    name="image-outline"
                    size={22}
                    color={colors.textMuted}
                  />
                </View>

                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.noPhotoTitle
                    }
                  >
                    No ID photo
                  </Text>

                  <Text
                    style={
                      styles.noPhotoText
                    }
                  >
                    Add a photo from the edit
                    profile page.
                  </Text>
                </View>
              </View>
            )}

            <View
              style={styles.infoList}
            >
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

        <View
          style={styles.contentSection}
        >
          <View
            style={styles.sectionHeading}
          >
            <View
              style={
                styles.sectionHeadingIcon
              }
            >
              <Ionicons
                name="receipt-outline"
                size={17}
                color={colors.navy}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={styles.sectionTitle}
              >
                Transaction history
              </Text>

              <Text
                style={styles.sectionSubtitle}
              >
                {transactions.length === 0
                  ? "No account activity yet"
                  : `${transactions.length} ${
                      transactions.length ===
                      1
                        ? "transaction"
                        : "transactions"
                    }`}
              </Text>
            </View>

            {transactions.length > 0 && (
              <View
                style={
                  styles.transactionCount
                }
              >
                <Text
                  style={
                    styles.transactionCountText
                  }
                >
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
              <View
                style={
                  styles.emptyStateWrapper
                }
              >
                <View
                  style={
                    styles.emptyIconOuter
                  }
                >
                  <View
                    style={styles.emptyIcon}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={29}
                      color={
                        colors.goldLight
                      }
                    />
                  </View>
                </View>

                <Text
                  style={styles.emptyTitle}
                >
                  No transactions yet
                </Text>

                <Text
                  style={
                    styles.emptySubtitle
                  }
                >
                  Credit sales and payments
                  for this customer will
                  appear here.
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

                  <Text
                    style={
                      styles.emptyActionText
                    }
                  >
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
                      handleDeleteTx(
                        tx.id
                      )
                    }
                    delayLongPress={450}
                    style={({ pressed }) => [
                      styles.txRow,
                      i !==
                        transactions.length -
                          1 &&
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

                    <View
                      style={styles.txMain}
                    >
                      <View
                        style={
                          styles.txTitleRow
                        }
                      >
                        <Text
                          style={
                            styles.txName
                          }
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
                                color:
                                  isCredit
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
                          formatPaymentMethod(
                            tx
                          ),
                          tx.payment_reference
                            ? `Reference: ${tx.payment_reference}`
                            : null,
                          tx.description,
                          formatDateTime(
                            tx.created_at
                          ),
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.txBalanceCol
                      }
                    >
                      <Text
                        style={[
                          styles.txAmount,
                          {
                            color:
                              isCredit
                                ? colors.danger
                                : colors.success,
                          },
                        ]}
                      >
                        {isCredit ? "+" : "-"}
                        {formatCurrency(
                          tx.amount
                        )}
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
              <View
                style={styles.hintIcon}
              >
                <Ionicons
                  name="finger-print-outline"
                  size={15}
                  color={colors.goldLight}
                />
              </View>

              <Text style={styles.hint}>
                Press and hold a transaction
                to remove it.
              </Text>
            </View>
          )}
        </View>

        {/* =====================================================
            ACCOUNT FOOTER
        ===================================================== */}

        <View
          style={styles.footerCard}
        >
          <View
            style={styles.footerIcon}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={colors.success}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={styles.footerTitle}
            >
              Account information
            </Text>

            <Text
              style={styles.footerText}
            >
              This debtor data is stored securely in your cloud account.
              in Track&Tally.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* =====================================================
          MAY UTANG PA WARNING MODAL
      ===================================================== */}

      <Modal
        visible={debtWarningVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={
          closeDebtWarning
        }
      >
        <View
          style={styles.debtWarningOverlay}
        >
          <View
            style={styles.debtWarningModal}
          >
            {/* WARNING ICON */}

            <View
              style={
                styles.debtWarningIconOuter
              }
            >
              <View
                style={
                  styles.debtWarningIconInner
                }
              >
                <Ionicons
                  name="alert"
                  size={32}
                  color={colors.goldDark}
                />
              </View>
            </View>

            {/* TITLE */}

            <Text
              style={styles.debtWarningTitle}
            >
              May utang pa
            </Text>

            {/* DESCRIPTION */}

            <Text
              style={
                styles.debtWarningSubtitle
              }
            >
              {debtor?.full_name ||
                "This debtor"}{" "}
              still has an outstanding
              balance. Please settle the
              balance before deleting this
              debtor.
            </Text>

            {/* BALANCE CARD */}

            <View
              style={
                styles.debtWarningBalanceCard
              }
            >
              <View
                style={
                  styles.debtWarningBalanceIcon
                }
              >
                <Ionicons
                  name="wallet-outline"
                  size={22}
                  color={colors.goldDark}
                />
              </View>

              <View
                style={
                  styles.debtWarningBalanceInfo
                }
              >
                <Text
                  style={
                    styles.debtWarningBalanceLabel
                  }
                >
                  OUTSTANDING BALANCE
                </Text>

                <Text
                  style={
                    styles.debtWarningBalanceValue
                  }
                >
                  {formatCurrency(
                    Number(
                      debtor?.balance || 0
                    )
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.debtWarningUnpaidBadge
                }
              >
                <Ionicons
                  name="alert-circle"
                  size={13}
                  color={colors.goldDark}
                />

                <Text
                  style={
                    styles.debtWarningUnpaidText
                  }
                >
                  UNPAID
                </Text>
              </View>
            </View>

            {/* INFORMATION BOX */}

            <View
              style={
                styles.debtWarningInfoBox
              }
            >
              <View
                style={
                  styles.debtWarningInfoIcon
                }
              >
                <Ionicons
                  name="information"
                  size={16}
                  color={colors.navy}
                />
              </View>

              <Text
                style={
                  styles.debtWarningInfoText
                }
              >
                This debtor cannot be deleted
                while there is still an unpaid
                balance. Record a payment
                first, then you can delete the
                debtor.
              </Text>
            </View>

            {/* OKAY BUTTON */}

            <Pressable
              onPress={closeDebtWarning}
              style={({ pressed }) => [
                styles.debtWarningButton,
                pressed &&
                  styles.debtWarningButtonPressed,
              ]}
            >
              <Text
                style={
                  styles.debtWarningButtonText
                }
              >
                Okay, Got It
              </Text>

              <View
                style={
                  styles.debtWarningButtonIcon
                }
              >
                <Ionicons
                  name="checkmark"
                  size={17}
                  color={colors.navy}
                />
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ===================================================== */}

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={
          cancelDeleteDebtor
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            {/* DELETE ICON */}

            <View style={styles.deleteModalIcon}>
              <Ionicons
                name="trash-outline"
                size={28}
                color={colors.danger}
              />
            </View>

            {/* TITLE */}

            <Text
              style={styles.deleteModalTitle}
            >
              Delete debtor?
            </Text>

            {/* DESCRIPTION */}

            <Text
              style={styles.deleteModalText}
            >
              Remove this debtor from your active list?
              Their transaction history will remain in Reports.
            </Text>

            {/* DEBTOR CARD */}

            <View
              style={styles.deletePersonCard}
            >
              <View
                style={styles.deletePersonAvatar}
              >
                <Ionicons
                  name="person"
                  size={20}
                  color={colors.goldLight}
                />
              </View>

              <View
                style={
                  styles.deletePersonInfo
                }
              >
                <Text
                  style={
                    styles.deletePersonName
                  }
                  numberOfLines={1}
                >
                  {debtor.full_name}
                </Text>

                <Text
                  style={
                    styles.deletePersonBalance
                  }
                >
                  Balance:{" "}
                  {formatCurrency(
                    debtor.balance || 0
                  )}
                </Text>
              </View>
            </View>

            {/* WARNING */}

            <View
              style={styles.deleteWarning}
            >
              <Ionicons
                name="warning-outline"
                size={17}
                color={colors.danger}
              />

              <Text
                style={styles.deleteWarningText}
              >
                This action cannot be undone.
              </Text>
            </View>

            {/* BUTTONS */}

            <View
              style={styles.deleteModalActions}
            >
              <Pressable
                onPress={
                  cancelDeleteDebtor
                }
                disabled={deleting}
                style={({ pressed }) => [
                  styles.cancelDeleteButton,
                  pressed &&
                    styles.modalButtonPressed,
                ]}
              >
                <Text
                  style={
                    styles.cancelDeleteText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={
                  confirmDeleteDebtor
                }
                disabled={deleting}
                style={({ pressed }) => [
                  styles.confirmDeleteButton,
                  pressed &&
                    styles.modalButtonPressed,
                  deleting &&
                    styles.confirmDeleteDisabled,
                ]}
              >
                {deleting ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.white}
                  />
                ) : (
                  <>
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={colors.white}
                    />

                    <Text
                      style={
                        styles.confirmDeleteText
                      }
                    >
                      Delete
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   FORMAT PAYMENT METHOD
========================================================= */

function formatPaymentMethod(transaction) {
  if (transaction.type !== "payment") {
    return null;
  }

  if (
    transaction.payment_method ===
    "e_wallet"
  ) {
    return transaction.payment_provider
      ? `E-wallet: ${transaction.payment_provider}`
      : "E-wallet";
  }

  if (
    transaction.payment_method ===
    "e_banking"
  ) {
    return "E-banking";
  }

  return transaction.payment_method ===
    "cash"
    ? "Cash"
    : null;
}

/* =========================================================
   INFO ROW
========================================================= */

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

      <View
        style={styles.infoContent}
      >
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
    transform: [
      {
        scale: 0.9,
      },
    ],
  },

  deleteDisabled: {
    opacity: 0.5,
  },

  buttonPressed: {
    opacity: 0.7,
    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  container: {
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    gap: 19,
    paddingBottom: spacing.lg,
  },

  /* =====================================================
     HERO
  ===================================================== */

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

  /* =====================================================
     QUICK ACTIONS
  ===================================================== */

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
    transform: [
      {
        scale: 0.975,
      },
    ],
  },

  /* =====================================================
     PROFILE
  ===================================================== */

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

  /* =====================================================
     TRANSACTIONS
  ===================================================== */

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

  /* =====================================================
     FOOTER
  ===================================================== */

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

  /* =====================================================
     MAY UTANG PA WARNING MODAL
  ===================================================== */

  debtWarningOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 25, 47, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  debtWarningModal: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 18,
  },

  debtWarningIconOuter: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: "#FFF9E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F2DF9B",
  },

  debtWarningIconInner: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#FFEFB2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0D878",
  },

  debtWarningTitle: {
    color: colors.navy,
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },

  debtWarningSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 5,
    marginBottom: 17,
  },

  debtWarningBalanceCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8DF",
    borderWidth: 1,
    borderColor: "#F0DB91",
    borderRadius: 17,
    padding: 13,
    marginBottom: 12,
  },

  debtWarningBalanceIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFEFB5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  debtWarningBalanceInfo: {
    flex: 1,
  },

  debtWarningBalanceLabel: {
    color: colors.goldDark,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 2,
  },

  debtWarningBalanceValue: {
    color: colors.navy,
    fontSize: 21,
    fontWeight: "900",
  },

  debtWarningUnpaidBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "#FFF0B8",
    gap: 4,
  },

  debtWarningUnpaidText: {
    color: colors.goldDark,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  debtWarningInfoBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F6EE",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    padding: 12,
    marginBottom: 17,
  },

  debtWarningInfoIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  debtWarningInfoText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 17,
  },

  debtWarningButton: {
    width: "100%",
    minHeight: 53,
    borderRadius: 17,
    backgroundColor: colors.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 9,
    elevation: 5,
  },

  debtWarningButtonPressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  debtWarningButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },

  debtWarningButtonIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },

  /* =====================================================
     DELETE MODAL
  ===================================================== */

  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "rgba(7, 27, 46, 0.72)",
  },

  deleteModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 25,
    padding: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOpacity: 0.3,
    shadowRadius: 25,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 12,
  },

  deleteModalIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: "#B3413B12",
    borderWidth: 1,
    borderColor: "#B3413B25",
    marginBottom: 13,
  },

  deleteModalTitle: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    color: colors.navy,
  },

  deleteModalText: {
    textAlign: "center",
    fontSize: 10.5,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 7,
    paddingHorizontal: 8,
  },

  deletePersonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 17,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },

  deletePersonAvatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
  },

  deletePersonInfo: {
    flex: 1,
  },

  deletePersonName: {
    fontSize: 12.5,
    fontWeight: "900",
    color: colors.navy,
  },

  deletePersonBalance: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: 3,
  },

  deleteWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: "#B3413B0D",
    borderWidth: 1,
    borderColor: "#B3413B20",
  },

  deleteWarningText: {
    flex: 1,
    fontSize: 9,
    fontWeight: "700",
    color: colors.danger,
  },

  deleteModalActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 17,
  },

  cancelDeleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cancelDeleteText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.navy,
  },

  confirmDeleteButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 14,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.danger,
  },

  confirmDeleteText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.white,
  },

  confirmDeleteDisabled: {
    opacity: 0.65,
  },

  modalButtonPressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },
});
