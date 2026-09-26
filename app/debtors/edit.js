import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import { colors, spacing, typography } from "@/constants/theme";
import { getDebtor, updateDebtor } from "@/db/database";
import { DebtorFields, IdPhotoPicker, useIdPhotoHandlers } from "./new";

export default function EditDebtorScreen() {
  const { debtorId } = useLocalSearchParams();
  const id = Number(debtorId);
  const db = useSQLiteContext();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [idPhotoUri, setIdPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const photoHandlers = useIdPhotoHandlers(setIdPhotoUri);

  useEffect(() => {
    let active = true;

    async function load() {
      const debtor = await getDebtor(db, id);
      if (!active || !debtor) return;

      setFullName(debtor.full_name || "");
      setContact(debtor.contact_number || "");
      setAddress(debtor.address || "");
      setNotes(debtor.notes || "");
      setCreditLimit(String(debtor.credit_limit || ""));
      setIdPhotoUri(debtor.id_photo_uri || null);
    }

    load();
    return () => {
      active = false;
    };
  }, [db, id]);

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert("Name required", "Please enter the customer's full name.");
      return;
    }

    setSaving(true);
    try {
      await updateDebtor(db, id, {
        full_name: fullName.trim(),
        contact_number: contact.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        credit_limit: Number(creditLimit) || 0,
        id_photo_uri: idPhotoUri,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Edit debtor</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <DebtorFields
          fullName={fullName}
          setFullName={setFullName}
          contact={contact}
          setContact={setContact}
          address={address}
          setAddress={setAddress}
          notes={notes}
          setNotes={setNotes}
          creditLimit={creditLimit}
          setCreditLimit={setCreditLimit}
        />
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Valid ID photo</Text>
          <IdPhotoPicker idPhotoUri={idPhotoUri} {...photoHandlers} />
        </View>

        <Button title="Save changes" onPress={handleSave} loading={saving} />
      </ScrollView>
      <BottomNav activeTab="debtors" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { ...typography.heading },
  form: { padding: spacing.md, gap: spacing.md, paddingBottom: bottomNavHeight + spacing.xl },
  label: { ...typography.label },
});
