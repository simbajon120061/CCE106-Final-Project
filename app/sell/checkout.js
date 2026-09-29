import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/Button";
import Card from "@/components/Card";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import { createSale, getDebtorOptions } from "@/db/database";

export default function CheckoutScreen() {
  const { cart } = useLocalSearchParams();
  const db = useSQLiteContext();
  const router = useRouter();

  const [saleType, setSaleType] = useState("cash");
  const [debtors, setDebtors] = useState([]);
  const [selectedDebtorId, setSelectedDebtorId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const cartItems = useMemo(() => {
    try {
      return JSON.parse(
        Array.isArray(cart) ? cart[0] : cart || "[]"
      );
    } catch {
      return [];
    }
  }, [cart]);

  useEffect(() => {
    getDebtorOptions(db).then(setDebtors);
  }, [db]);

  const total = cartItems.reduce(
    (sum, item) =>
      sum + item.quantity * item.product.unit_price,
    0
  );

  const selectedDebtor = debtors.find(
    (debtor) => debtor.id === selectedDebtorId
  );

  function handleConfirmPress() {
    if (saleType === "credit" && !selectedDebtorId) {
      Alert.alert(
        "Select debtor",
        "Choose which customer this utang belongs to."
      );
      return;
    }

    setShowConfirmModal(true);
  }

  async function handleCompleteSale() {
    setShowConfirmModal(false);
    setSaving(true);

    try {
      await createSale(db, {
        saleType,
        debtorId: selectedDebtorId,
        items: cartItems,
      });

      Alert.alert(
        "Sale recorded",
        `Total: ${formatCurrency(total)}`,
        [
          {
            text: "OK",
            onPress: () => router.replace("/sell"),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Could not complete sale",
        error.message ||
          "Please check stock and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="close"
            size={21}
            color={colors.navy}
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>SELL</Text>
          <Text style={styles.title}>Checkout</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* ORDER SUMMARY HEADER */}
        <View style={styles.sectionIntro}>
          <View style={styles.sectionIntroIcon}>
            <Ionicons
              name="receipt-outline"
              size={22}
              color={colors.gold}
            />
          </View>

          <View style={styles.sectionIntroText}>
            <Text style={styles.sectionIntroTitle}>
              Order summary
            </Text>

            <Text style={styles.sectionIntroSubtitle}>
              Review the items before completing the sale
            </Text>
          </View>

          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>
              {cartItems.length}
            </Text>
          </View>
        </View>

        {/* CART ITEMS */}
        <Card style={styles.itemsCard}>
          {cartItems.map((item, index) => (
            <View
              key={item.product.id}
              style={[
                styles.itemRow,
                index !== cartItems.length - 1 &&
                  styles.rowBorder,
              ]}
            >
              <View style={styles.itemIcon}>
                <Ionicons
                  name="cube-outline"
                  size={19}
                  color={colors.navy}
                />
              </View>

              <View style={styles.itemInfo}>
                <Text
                  style={styles.itemName}
                  numberOfLines={1}
                >
                  {item.product.name}
                </Text>

                <View style={styles.itemDetails}>
                  <View style={styles.quantityBadge}>
                    <Text style={styles.quantityText}>
                      × {item.quantity}
                    </Text>
                  </View>

                  <Text style={styles.itemUnitPrice}>
                    {formatCurrency(
                      item.product.unit_price
                    )}{" "}
                    each
                  </Text>
                </View>
              </View>

              <Text style={styles.itemTotal}>
                {formatCurrency(
                  item.quantity *
                    item.product.unit_price
                )}
              </Text>
            </View>
          ))}
        </Card>

        {/* TOTAL */}
        <View style={styles.totalCard}>
          <View style={styles.totalTop}>
            <View style={styles.totalIcon}>
              <Ionicons
                name="cash-outline"
                size={21}
                color={colors.goldLight}
              />
            </View>

            <Text style={styles.totalLabel}>
              TOTAL AMOUNT
            </Text>
          </View>

          <Text style={styles.totalValue}>
            {formatCurrency(total)}
          </Text>

          <View style={styles.totalBottom}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={colors.goldLight}
            />

            <Text style={styles.totalHint}>
              Review the payment method below
            </Text>
          </View>
        </View>

        {/* PAYMENT TYPE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Payment type
              </Text>

              <Text style={styles.sectionSubtitle}>
                How will this sale be recorded?
              </Text>
            </View>

            <View style={styles.paymentIcon}>
              <Ionicons
                name="card-outline"
                size={19}
                color={colors.navy}
              />
            </View>
          </View>

          <View style={styles.typeRow}>
            <OptionChip
              icon="cash-outline"
              label="Cash"
              active={saleType === "cash"}
              onPress={() => setSaleType("cash")}
            />

            <OptionChip
              icon="time-outline"
              label="Utang"
              active={saleType === "credit"}
              onPress={() => setSaleType("credit")}
            />
          </View>
        </View>

        {/* DEBTOR SECTION */}
        {saleType === "credit" && (
          <View style={styles.section}>
            <View style={styles.debtorHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Select debtor
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Choose who this credit sale belongs to
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  router.push("/debtors/new")
                }
                style={({ pressed }) => [
                  styles.addDebtorButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="add"
                  size={15}
                  color={colors.navy}
                />

                <Text style={styles.addDebtorText}>
                  Add debtor
                </Text>
              </Pressable>
            </View>

            {debtors.length === 0 ? (
              <View style={styles.emptyDebtor}>
                <View style={styles.emptyDebtorIcon}>
                  <Ionicons
                    name="people-outline"
                    size={24}
                    color={colors.textMuted}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No debtors yet
                </Text>

                <Text style={styles.emptyText}>
                  Add a debtor first to record this
                  sale as utang.
                </Text>
              </View>
            ) : (
              <View style={styles.debtorList}>
                {debtors.map((debtor, index) => {
                  const active =
                    selectedDebtorId === debtor.id;

                  return (
                    <Pressable
                      key={debtor.id}
                      style={[
                        styles.debtorRow,
                        index !== debtors.length - 1 &&
                          styles.rowBorder,
                        active &&
                          styles.debtorRowActive,
                      ]}
                      onPress={() =>
                        setSelectedDebtorId(
                          debtor.id
                        )
                      }
                    >
                      <View
                        style={[
                          styles.debtorAvatar,
                          active &&
                            styles.debtorAvatarActive,
                        ]}
                      >
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color={
                            active
                              ? colors.goldLight
                              : colors.navy
                          }
                        />
                      </View>

                      <View style={styles.debtorInfo}>
                        <Text
                          style={[
                            styles.debtorName,
                            active &&
                              styles.debtorNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {debtor.full_name}
                        </Text>

                        <View
                          style={
                            styles.debtorBalanceRow
                          }
                        >
                          <Text
                            style={[
                              styles.debtorMeta,
                              active &&
                                styles.debtorMetaActive,
                            ]}
                          >
                            Current balance
                          </Text>

                          <Text
                            style={[
                              styles.debtorBalance,
                              active &&
                                styles.debtorBalanceActive,
                            ]}
                          >
                            {formatCurrency(
                              debtor.balance || 0
                            )}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.checkCircle,
                          active &&
                            styles.checkCircleActive,
                        ]}
                      >
                        {active && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={colors.navy}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* CONFIRMATION INFO */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.navy}
            />
          </View>

          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>
              Ready to complete?
            </Text>

            <Text style={styles.infoSubtitle}>
              {saleType === "cash"
                ? "This sale will be recorded as a cash transaction."
                : selectedDebtorId
                ? "This sale will be added to the selected debtor's balance."
                : "Select a debtor before confirming the sale."}
            </Text>
          </View>
        </View>

        {/* CONFIRM BUTTON */}
        <View style={styles.confirmContainer}>
          <Button
            title={
              saving ? "Saving..." : "Confirm Sale"
            }
            onPress={handleConfirmPress}
            loading={saving}
          />
        </View>
      </ScrollView>

      <BottomNav activeTab="sell" />

      {/* CONFIRM SALE MODAL */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowConfirmModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() =>
              setShowConfirmModal(false)
            }
          />

          <View style={styles.modalCard}>
            {/* MODAL ICON */}
            <View style={styles.modalIcon}>
              <Ionicons
                name="receipt-outline"
                size={28}
                color={colors.navy}
              />
            </View>

            {/* MODAL TITLE */}
            <Text style={styles.modalTitle}>
              Confirm Sale
            </Text>

            <Text style={styles.modalSubtitle}>
              Please review the details before
              completing this transaction.
            </Text>

            {/* MODAL SUMMARY */}
            <View style={styles.modalSummary}>
              <View style={styles.modalSummaryRow}>
                <View style={styles.summaryLabelRow}>
                  <Ionicons
                    name="cube-outline"
                    size={17}
                    color={colors.textMuted}
                  />

                  <Text style={styles.summaryLabel}>
                    Items
                  </Text>
                </View>

                <Text style={styles.summaryValue}>
                  {cartItems.length}
                </Text>
              </View>

              <View style={styles.modalDivider} />

              <View style={styles.modalSummaryRow}>
                <View style={styles.summaryLabelRow}>
                  <Ionicons
                    name="card-outline"
                    size={17}
                    color={colors.textMuted}
                  />

                  <Text style={styles.summaryLabel}>
                    Payment
                  </Text>
                </View>

                <View
                  style={[
                    styles.paymentBadge,
                    saleType === "credit" &&
                      styles.paymentBadgeCredit,
                  ]}
                >
                  <Text style={styles.paymentBadgeText}>
                    {saleType === "cash"
                      ? "Cash"
                      : "Utang"}
                  </Text>
                </View>
              </View>

              {saleType === "credit" &&
                selectedDebtor && (
                  <>
                    <View style={styles.modalDivider} />

                    <View
                      style={styles.modalSummaryRow}
                    >
                      <View
                        style={styles.summaryLabelRow}
                      >
                        <Ionicons
                          name="person-outline"
                          size={17}
                          color={colors.textMuted}
                        />

                        <Text
                          style={styles.summaryLabel}
                        >
                          Debtor
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.summaryValue,
                          styles.debtorSummaryValue,
                        ]}
                        numberOfLines={1}
                      >
                        {selectedDebtor.full_name}
                      </Text>
                    </View>
                  </>
                )}

              <View style={styles.modalDivider} />

              <View
                style={[
                  styles.modalTotalRow,
                  { marginTop: 4 },
                ]}
              >
                <Text style={styles.modalTotalLabel}>
                  Total amount
                </Text>

                <Text style={styles.modalTotalValue}>
                  {formatCurrency(total)}
                </Text>
              </View>
            </View>

            {/* NOTICE */}
            <View style={styles.modalNotice}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={colors.navy}
              />

              <Text style={styles.modalNoticeText}>
                This action will record the sale and
                update the inventory.
              </Text>
            </View>

            {/* MODAL BUTTONS */}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() =>
                  setShowConfirmModal(false)
                }
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCompleteSale}
                disabled={saving}
                style={({ pressed }) => [
                  styles.completeButton,
                  pressed &&
                    !saving &&
                    styles.completeButtonPressed,
                  saving && styles.completeButtonDisabled,
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color={colors.navy}
                />

                <Text style={styles.completeButtonText}>
                  {saving
                    ? "Saving..."
                    : "Complete Sale"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function OptionChip({
  label,
  icon,
  active,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.typeChip,
        active && styles.typeChipActive,
        pressed && styles.typeChipPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.typeIcon,
          active && styles.typeIconActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            active
              ? colors.navy
              : colors.textMuted
          }
        />
      </View>

      <Text
        style={[
          styles.typeText,
          active && styles.typeTextActive,
        ]}
      >
        {label}
      </Text>

      {active && (
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={colors.goldLight}
          style={styles.typeCheck}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  /* HEADER */
  header: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },

  headerCenter: {
    alignItems: "center",
    justifyContent: "center",
  },

  headerEyebrow: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 2,
  },

  title: {
    ...typography.heading,
    fontSize: 19,
    color: colors.navy,
  },

  headerPlaceholder: {
    width: 42,
  },

  /* CONTAINER */
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom:
      bottomNavHeight + spacing.xl + 20,
  },

  /* INTRO */
  sectionIntro: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionIntroIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionIntroText: {
    flex: 1,
  },

  sectionIntroTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "900",
  },

  sectionIntroSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  itemCountBadge: {
    minWidth: 31,
    height: 29,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  itemCountText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: "900",
  },

  /* ITEMS */
  itemsCard: {
    padding: 0,
    overflow: "hidden",
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: 11,
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  itemInfo: {
    flex: 1,
    minWidth: 0,
  },

  itemName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },

  itemDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 7,
  },

  quantityBadge: {
    backgroundColor: "rgba(217,169,40,0.13)",
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  quantityText: {
    color: colors.navy,
    fontSize: 10,
    fontWeight: "800",
  },

  itemUnitPrice: {
    color: colors.textMuted,
    fontSize: 10,
  },

  itemTotal: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.navy,
  },

  /* TOTAL */
  totalCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    padding: spacing.lg,
    overflow: "hidden",
  },

  totalTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  totalIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  totalLabel: {
    color: colors.goldLight,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  totalValue: {
    color: colors.white,
    fontSize: 31,
    fontWeight: "900",
    marginTop: 9,
    letterSpacing: -0.5,
  },

  totalBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },

  totalHint: {
    color: colors.goldLight,
    fontSize: 10,
    fontWeight: "500",
  },

  /* SECTION */
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
    color: colors.navy,
  },

  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },

  paymentIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  /* PAYMENT TYPE */
  typeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  typeChip: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
  },

  typeChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },

  typeChipPressed: {
    transform: [{ scale: 0.98 }],
  },

  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  typeIconActive: {
    backgroundColor: colors.goldLight,
  },

  typeText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },

  typeTextActive: {
    color: colors.white,
  },

  typeCheck: {
    marginLeft: "auto",
  },

  /* DEBTOR */
  debtorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  addDebtorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: "rgba(217,169,40,0.12)",
  },

  addDebtorText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: "900",
  },

  debtorList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: "hidden",
  },

  debtorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    gap: 10,
    backgroundColor: colors.white,
  },

  debtorRowActive: {
    backgroundColor: colors.navy,
  },

  debtorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  debtorAvatarActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  debtorInfo: {
    flex: 1,
    minWidth: 0,
  },

  debtorName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },

  debtorNameActive: {
    color: colors.white,
  },

  debtorBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 5,
  },

  debtorMeta: {
    fontSize: 10,
    color: colors.textMuted,
  },

  debtorMetaActive: {
    color: colors.goldLight,
  },

  debtorBalance: {
    fontSize: 10,
    color: colors.navy,
    fontWeight: "800",
  },

  debtorBalanceActive: {
    color: colors.white,
  },

  checkCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  checkCircleActive: {
    backgroundColor: colors.goldLight,
    borderColor: colors.goldLight,
  },

  /* EMPTY DEBTOR */
  emptyDebtor: {
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  emptyDebtorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  emptyTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },

  emptyText: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },

  /* INFO */
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(217,169,40,0.10)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(217,169,40,0.25)",
    padding: spacing.md,
  },

  infoIcon: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  infoText: {
    flex: 1,
  },

  infoTitle: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 3,
  },

  infoSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },

  /* CONFIRM */
  confirmContainer: {
    marginTop: 2,
  },

  /* =========================
     CONFIRMATION MODAL
  ========================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(8,18,38,0.68)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },

  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },

  modalTitle: {
    color: colors.navy,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },

  modalSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
    marginBottom: 17,
    paddingHorizontal: 15,
  },

  modalSummary: {
    backgroundColor: colors.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    paddingVertical: 5,
  },

  modalSummaryRow: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  summaryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  summaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },

  summaryValue: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "900",
    maxWidth: "58%",
    textAlign: "right",
  },

  debtorSummaryValue: {
    fontSize: 11,
  },

  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  paymentBadge: {
    backgroundColor: colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },

  paymentBadgeCredit: {
    backgroundColor: colors.gold,
  },

  paymentBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "900",
  },

  modalTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalTotalLabel: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "900",
  },

  modalTotalValue: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "900",
  },

  modalNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(217,169,40,0.10)",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginTop: 13,
    gap: 8,
  },

  modalNoticeText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },

  modalActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 17,
  },

  cancelButton: {
    flex: 0.85,
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },

  completeButton: {
    flex: 1.45,
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.goldLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  completeButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  completeButtonDisabled: {
    opacity: 0.55,
  },

  completeButtonText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "900",
  },
});

