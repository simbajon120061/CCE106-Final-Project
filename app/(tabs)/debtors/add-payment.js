import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import Button from "@/components/Button";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import { addPaymentTransaction, getDebtor } from "@/db/database";
import { useAuth } from "@/context/AuthContext";

export default function AddPaymentScreen() {
  const { debtorId } = useLocalSearchParams();
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();

  const [debtor, setDebtor] = useState(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [walletProvider, setWalletProvider] = useState("gcash");
  const [customWallet, setCustomWallet] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [methodMenuVisible, setMethodMenuVisible] = useState(false);
  const [walletMenuVisible, setWalletMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    getDebtor(db, debtorId, user?.id).then(setDebtor);
  }, [db, debtorId, user?.id]);

  async function handleSave() {
    const amt = Number(amount);

    if (!amt || amt <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }

    if (amt > balance) {
      Alert.alert(
        "Payment exceeds balance",
        `The outstanding utang is only ${formatCurrency(balance)}. Enter an amount that does not exceed the current balance.`
      );
      return;
    }

    if (paymentMethod === "e_wallet" && walletProvider === "other" && !customWallet.trim()) {
      Alert.alert("Wallet required", "Enter the name of the e-wallet used.");
      return;
    }

    setSaving(true);

    try {
      await addPaymentTransaction(db, {
        userId: user?.id,
        debtorId: String(debtorId),
        amount: amt,
        description: description.trim() || null,
        paymentMethod,
        paymentProvider:
          paymentMethod === "e_wallet"
            ? walletProvider === "other"
              ? customWallet.trim()
              : walletProvider === "gcash"
                ? "GCash"
                : "Maya"
            : null,
        paymentReference:
          paymentMethod === "cash"
            ? null
            : paymentReference.trim() || null,
      });

      const provider =
        paymentMethod === "e_wallet"
          ? walletProvider === "other"
            ? customWallet.trim()
            : walletProvider === "gcash"
              ? "GCash"
              : "Maya"
          : null;
      setReceipt({
        date: new Date(),
        storeName: user?.storeName || "My Store",
        debtorName: debtor?.full_name || "Debtor",
        amount: amt,
        balanceAfter: Math.max(0, balance - amt),
        paymentMethod:
          PAYMENT_METHODS.find((method) => method.value === paymentMethod)
            ?.label || "Cash",
        provider,
        reference:
          paymentMethod === "cash"
            ? null
            : paymentReference.trim() || null,
        description: description.trim() || null,
      });
    } catch (error) {
      Alert.alert(
        "Unable to save payment",
        error?.message || "Please check the payment amount and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function closeReceipt() {
    setReceipt(null);
    router.back();
  }

  async function printReceipt() {
    if (!receipt) return;
    try {
      await Print.printAsync({ html: buildPaymentReceiptHtml(receipt) });
    } catch (error) {
      Alert.alert(
        "Could not print receipt",
        error?.message || "Please try again."
      );
    }
  }

  const balance = debtor?.balance ?? 0;
  const enteredAmount = Number(amount);
  const paymentExceedsBalance =
    Number.isFinite(enteredAmount) && enteredAmount > balance;

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
          <Ionicons name="close" size={22} color={colors.navy} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>DEBTORS</Text>
          <Text style={styles.title}>Record Payment</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.form}
      >
        {/* INTRO CARD */}
        <View style={styles.introCard}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="wallet-outline"
              size={24}
              color={colors.gold}
            />
          </View>

          <View style={styles.introText}>
            <Text style={styles.introTitle}>Add a payment</Text>
            <Text style={styles.introSubtitle}>
              Record a payment received from this debtor.
            </Text>
          </View>
        </View>

        {/* CURRENT BALANCE */}
        <View style={styles.balanceBanner}>
          <View style={styles.balanceTop}>
            <View style={styles.balanceIcon}>
              <Ionicons
                name="cash-outline"
                size={20}
                color={colors.goldLight}
              />
            </View>

            <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
          </View>

          <Text style={styles.balanceValue}>
            {formatCurrency(balance)}
          </Text>

          <View style={styles.balanceBottom}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={colors.goldLight}
            />
            <Text style={styles.balanceHint}>
              Outstanding amount
            </Text>
          </View>
        </View>

        {/* AMOUNT SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Payment details</Text>
              <Text style={styles.sectionSubtitle}>
                Enter the amount received
              </Text>
            </View>

            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          </View>

          <Field label="Amount paid (₱) *">
            <View style={styles.inputWrapper}>
              <View style={styles.currencyBox}>
                <Text style={styles.currencyText}>₱</Text>
              </View>

              <TextInput
                value={amount}
                onChangeText={(value) => setAmount(sanitizeAmount(value))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                style={styles.amountInput}
              />
            </View>
            {paymentExceedsBalance ? (
              <Text style={styles.amountWarning}>
                Payment cannot exceed the outstanding balance of {formatCurrency(balance)}.
              </Text>
            ) : null}
          </Field>

          {/* QUICK PAYMENT */}
          {balance > 0 && (
            <View style={styles.quickSection}>
              <View style={styles.quickHeader}>
                <Text style={styles.quickTitle}>Quick amount</Text>
                <Ionicons
                  name="flash-outline"
                  size={15}
                  color={colors.gold}
                />
              </View>

              <View style={styles.quickRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.quickChip,
                    pressed && styles.quickPressed,
                  ]}
                  onPress={() => setAmount(balance.toFixed(2))}
                >
                  <View style={styles.quickIcon}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={17}
                      color={colors.gold}
                    />
                  </View>

                  <View>
                    <Text style={styles.quickChipText}>
                      Pay full balance
                    </Text>
                    <Text style={styles.quickAmount}>
                      {formatCurrency(balance)}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.quickChip,
                    pressed && styles.quickPressed,
                  ]}
                  onPress={() =>
                    setAmount((balance / 2).toFixed(2))
                  }
                >
                  <View style={styles.quickIcon}>
                    <Ionicons
                      name="remove-circle-outline"
                      size={17}
                      color={colors.gold}
                    />
                  </View>

                  <View>
                    <Text style={styles.quickChipText}>
                      Pay half
                    </Text>
                    <Text style={styles.quickAmount}>
                      {formatCurrency(balance / 2)}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Payment method</Text>
              <Text style={styles.sectionSubtitle}>
                Choose how this payment was received
              </Text>
            </View>

            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          </View>

          <PaymentDropdown
            label="Payment method *"
            value={paymentMethod}
            options={PAYMENT_METHODS}
            visible={methodMenuVisible}
            onOpen={() => setMethodMenuVisible(true)}
            onClose={() => setMethodMenuVisible(false)}
            onSelect={(value) => {
              setPaymentMethod(value);
              setMethodMenuVisible(false);
            }}
          />

          {paymentMethod === "e_wallet" ? (
            <>
              <PaymentDropdown
                label="E-wallet provider *"
                value={walletProvider}
                options={WALLET_PROVIDERS}
                visible={walletMenuVisible}
                onOpen={() => setWalletMenuVisible(true)}
                onClose={() => setWalletMenuVisible(false)}
                onSelect={(value) => {
                  setWalletProvider(value);
                  setWalletMenuVisible(false);
                }}
              />

              {walletProvider === "other" ? (
                <Field label="E-wallet name *">
                  <TextInput
                    value={customWallet}
                    onChangeText={setCustomWallet}
                    placeholder="Enter wallet name"
                    placeholderTextColor={colors.textMuted}
                    style={styles.selectInput}
                  />
                </Field>
              ) : null}
            </>
          ) : null}

          {paymentMethod === "e_wallet" || paymentMethod === "e_banking" ? (
            <Field label="Reference number">
              <TextInput
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="Enter transaction reference"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.selectInput}
              />
            </Field>
          ) : null}
        </View>

        {/* NOTE SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Payment note</Text>
              <Text style={styles.sectionSubtitle}>
                Add an optional note for this transaction
              </Text>
            </View>

            <View style={styles.optionalBadge}>
              <Text style={styles.optionalText}>Optional</Text>
            </View>
          </View>

          <Field label="Note">
            <View style={styles.noteWrapper}>
              <Ionicons
                name="create-outline"
                size={19}
                color={colors.textMuted}
                style={styles.noteIcon}
              />

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Partial payment, cash payment..."
                placeholderTextColor={colors.textMuted}
                style={styles.noteInput}
                multiline
                textAlignVertical="top"
              />
            </View>
          </Field>
        </View>

        {/* SUMMARY */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="receipt-outline"
              size={20}
              color={colors.navy}
            />
          </View>

          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              Ready to save?
            </Text>

            <Text style={styles.summarySubtitle}>
              This payment will be added to the debtor transaction
              history.
            </Text>
          </View>
        </View>

        {/* SAVE BUTTON */}
        <View style={styles.buttonContainer}>
          <Button
            title="Save Payment"
            onPress={handleSave}
            loading={saving}
          />

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelPressed,
            ]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={!!receipt}
        transparent
        animationType="slide"
        onRequestClose={closeReceipt}
      >
        <View style={styles.receiptOverlay}>
          {receipt && (
            <View style={styles.receiptCard}>
              <View style={styles.receiptIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={28}
                  color={colors.navy}
                />
              </View>
              <Text style={styles.receiptTitle}>Payment recorded</Text>
              <Text style={styles.receiptStore}>{receipt.storeName}</Text>
              <Text style={styles.receiptMeta}>
                {receipt.date.toLocaleString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>

              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Received from</Text>
                <Text style={styles.receiptValue} numberOfLines={1}>
                  {receipt.debtorName}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment method</Text>
                <Text style={styles.receiptValue}>
                  {receipt.provider
                    ? `${receipt.paymentMethod} · ${receipt.provider}`
                    : receipt.paymentMethod}
                </Text>
              </View>
              {receipt.reference ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Reference</Text>
                  <Text style={styles.receiptValue} numberOfLines={1}>
                    {receipt.reference}
                  </Text>
                </View>
              ) : null}
              {receipt.description ? (
                <View style={styles.receiptNote}>
                  <Text style={styles.receiptLabel}>Note</Text>
                  <Text style={styles.receiptNoteText}>
                    {receipt.description}
                  </Text>
                </View>
              ) : null}

              <View style={styles.receiptDivider} />
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>Amount paid</Text>
                <Text style={styles.receiptTotalValue}>
                  {formatCurrency(receipt.amount)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Remaining balance</Text>
                <Text style={styles.receiptValue}>
                  {formatCurrency(receipt.balanceAfter)}
                </Text>
              </View>

              <View style={styles.receiptActions}>
                <Pressable
                  onPress={printReceipt}
                  style={({ pressed }) => [
                    styles.receiptPrintButton,
                    pressed && styles.receiptButtonPressed,
                  ]}
                >
                  <Ionicons
                    name="print-outline"
                    size={18}
                    color={colors.navy}
                  />
                  <Text style={styles.receiptPrintText}>Print / PDF</Text>
                </Pressable>
                <Pressable
                  onPress={closeReceipt}
                  style={({ pressed }) => [
                    styles.receiptDoneButton,
                    pressed && styles.receiptButtonPressed,
                  ]}
                >
                  <Text style={styles.receiptDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPaymentReceiptHtml(receipt) {
  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;max-width:360px;margin:0 auto;padding:24px;color:#20242c;">
        <h2 style="margin:0;text-align:center;color:#1E3A5F;">${escapeHtml(receipt.storeName)}</h2>
        <p style="text-align:center;color:#6B7280;font-size:12px;margin:4px 0 16px;">Payment receipt · ${escapeHtml(receipt.date.toLocaleString("en-PH"))}</p>
        <hr style="border:none;border-top:1px dashed #999;margin:14px 0;" />
        <p style="font-size:13px;margin:6px 0;">Received from: <b>${escapeHtml(receipt.debtorName)}</b></p>
        <p style="font-size:13px;margin:6px 0;">Payment method: <b>${escapeHtml(receipt.provider ? `${receipt.paymentMethod} · ${receipt.provider}` : receipt.paymentMethod)}</b></p>
        ${receipt.reference ? `<p style="font-size:13px;margin:6px 0;">Reference: <b>${escapeHtml(receipt.reference)}</b></p>` : ""}
        ${receipt.description ? `<p style="font-size:13px;margin:6px 0;">Note: ${escapeHtml(receipt.description)}</p>` : ""}
        <hr style="border:none;border-top:1px dashed #999;margin:14px 0;" />
        <h3 style="text-align:right;margin:14px 0 6px;">Amount paid: ${formatCurrency(receipt.amount)}</h3>
        <p style="text-align:right;font-size:13px;margin:6px 0;">Remaining balance: <b>${formatCurrency(receipt.balanceAfter)}</b></p>
        <p style="text-align:center;color:#6B7280;font-size:11px;margin-top:24px;">Thank you!</p>
      </body>
    </html>`;
}

function sanitizeAmount(value) {
  // Keep the input non-negative and restrict it to a currency amount.
  const numeric = value.replace(/[^0-9.]/g, "");
  const [whole = "", ...decimalParts] = numeric.split(".");
  return decimalParts.length
    ? `${whole}.${decimalParts.join("").slice(0, 2)}`
    : whole;
}

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: "cash-outline" },
  { value: "e_wallet", label: "E-wallet", icon: "phone-portrait-outline" },
  { value: "e_banking", label: "E-banking", icon: "business-outline" },
];

const WALLET_PROVIDERS = [
  { value: "gcash", label: "GCash", icon: "wallet-outline" },
  { value: "maya", label: "Maya", icon: "wallet-outline" },
  { value: "other", label: "Add another", icon: "add-circle-outline" },
];

function PaymentDropdown({
  label,
  value,
  options,
  visible,
  onOpen,
  onClose,
  onSelect,
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <>
      <Field label={label}>
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [
            styles.selectInput,
            styles.selectTrigger,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.selectValue}>
            <Ionicons
              name={selectedOption?.icon || "wallet-outline"}
              size={19}
              color={colors.navy}
            />
            <Text style={styles.selectText}>{selectedOption?.label}</Text>
          </View>
          <Ionicons name="chevron-down" size={19} color={colors.textMuted} />
        </Pressable>
      </Field>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{label.replace(" *", "")}</Text>
            {options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => onSelect(option.value)}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  option.value === value && styles.dropdownOptionSelected,
                  pressed && styles.dropdownOptionPressed,
                ]}
              >
                <View style={styles.dropdownOptionIcon}>
                  <Ionicons name={option.icon} size={20} color={colors.navy} />
                </View>
                <Text style={styles.dropdownOptionText}>{option.label}</Text>
                {option.value === value ? (
                  <Ionicons name="checkmark" size={20} color={colors.success} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  headerCenter: {
    alignItems: "center",
    justifyContent: "center",
  },

  headerEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: colors.gold,
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

  /* FORM */
  form: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom:spacing.lg,
  },

  /* INTRO */
  introCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  introText: {
    flex: 1,
  },

  introTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 3,
  },

  introSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },

  /* BALANCE */
  balanceBanner: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    padding: spacing.lg,
    overflow: "hidden",
  },

  balanceTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  balanceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  balanceLabel: {
    color: colors.goldLight,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  balanceValue: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 10,
    letterSpacing: -0.5,
  },

  balanceBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },

  balanceHint: {
    color: colors.goldLight,
    fontSize: 11,
    fontWeight: "500",
  },

  /* SECTIONS */
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
  },

  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },

  requiredBadge: {
    backgroundColor: "rgba(217,169,40,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
  },

  requiredText: {
    color: colors.navy,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  optionalBadge: {
    backgroundColor: colors.cream,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
  },

  optionalText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  /* FIELD */
  field: {
    gap: 7,
  },

  label: {
    ...typography.label,
    color: colors.navy,
    fontSize: 12,
  },

  /* AMOUNT INPUT */
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    minHeight: 58,
    overflow: "hidden",
  },

  currencyBox: {
    width: 52,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
  },

  currencyText: {
    color: colors.goldLight,
    fontSize: 22,
    fontWeight: "800",
  },

  amountInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontSize: 23,
    fontWeight: "800",
    color: colors.navy,
  },

  amountWarning: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },

  selectInput: {
    minHeight: 52,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
  },

  selectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  selectText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },

  receiptOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },

  receiptCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },

  receiptIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
    marginBottom: 10,
  },

  receiptTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },

  receiptStore: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },

  receiptMeta: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
  },

  receiptDivider: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    marginVertical: 12,
  },

  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 5,
  },

  receiptLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },

  receiptValue: {
    flexShrink: 1,
    color: colors.navy,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },

  receiptNote: {
    paddingVertical: 5,
    gap: 4,
  },

  receiptNoteText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },

  receiptTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 8,
  },

  receiptTotalLabel: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "900",
  },

  receiptTotalValue: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: "900",
  },

  receiptActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 16,
  },

  receiptPrintButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },

  receiptPrintText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "800",
  },

  receiptDoneButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.navy,
  },

  receiptDoneText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },

  receiptButtonPressed: {
    opacity: 0.75,
  },

  dropdownModal: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
  },

  dropdownTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },

  dropdownOption: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },

  dropdownOptionSelected: {
    backgroundColor: "rgba(217,169,40,0.12)",
  },

  dropdownOptionPressed: {
    backgroundColor: colors.cream,
  },

  dropdownOptionIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: colors.cream,
  },

  dropdownOptionText: {
    flex: 1,
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },

  /* QUICK PAYMENTS */
  quickSection: {
    gap: 9,
  },

  quickHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  quickTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.navy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  quickRow: {
    flexDirection: "row",
    gap: 9,
  },

  quickChip: {
    flex: 1,
    minHeight: 66,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.sm,
    backgroundColor: "rgba(217,169,40,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  quickPressed: {
    backgroundColor: "rgba(217,169,40,0.15)",
    transform: [{ scale: 0.98 }],
  },

  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  quickChipText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: "800",
  },

  quickAmount: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
  },

  /* NOTE */
  noteWrapper: {
    minHeight: 90,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  noteIcon: {
    marginTop: 2,
    marginRight: 9,
  },

  noteInput: {
    flex: 1,
    minHeight: 65,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    padding: 0,
  },

  /* SUMMARY */
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(217,169,40,0.10)",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(217,169,40,0.25)",
  },

  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  summaryText: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 3,
  },

  summarySubtitle: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textMuted,
  },

  /* BUTTON */
  buttonContainer: {
    gap: 8,
    marginTop: 2,
  },

  cancelButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },

  cancelPressed: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },

  cancelText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
});
