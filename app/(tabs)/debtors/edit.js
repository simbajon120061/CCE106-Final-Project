import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import { colors, spacing, typography } from "@/constants/theme";
import { getDebtor, updateDebtor } from "@/db/database";
import { useAuth } from "@/context/AuthContext";
import { DebtorFields, DebtorPhotoPicker, usePhotoHandlers } from "./new";

export default function EditDebtorScreen() {
  const { debtorId } = useLocalSearchParams();
  const id = Number(debtorId);
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
  const idPhotoHandlers = usePhotoHandlers(setIdPhotoUri, "ID photo");

  useEffect(() => {
    let active = true;

    async function load() {
      const debtor = await getDebtor(db, Number(id), user?.id);
      if (!active || !debtor) return;

      setFullName(debtor.full_name || "");
      setContact(debtor.contact_number || "");
      setIdNumber(debtor.id_number || "");
      setAddress(debtor.address || "");
      setNotes(debtor.notes || "");
      setCreditLimit(String(debtor.credit_limit || ""));
      setProfilePhotoUri(debtor.profile_photo_uri || null);
      setIdPhotoUri(debtor.id_photo_uri || null);
    }

    load();
    return () => {
      active = false;
    };
  }, [db, id, user?.id]);

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert("Name required", "Please enter the customer's full name.");
      return;
    }

    setSaving(true);
    try {
      await updateDebtor(db, Number(id), {
        full_name: fullName.trim(),
        contact_number: contact.trim() || null,
        id_number: idNumber.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        credit_limit: Number(creditLimit) || 0,
        profile_photo_uri: profilePhotoUri,
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

      <ScrollView
        contentContainerStyle={styles.form}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
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
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Profile photo</Text>
          <DebtorPhotoPicker
            photoUri={profilePhotoUri}
            photoName="Profile photo"
            {...profilePhotoHandlers}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Valid ID photo</Text>
          <DebtorPhotoPicker
            photoUri={idPhotoUri}
            photoName="ID photo"
            {...idPhotoHandlers}
          />
        </View>

        <Button title="Save changes" onPress={handleSave} loading={saving} />
      </ScrollView>
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
  form: { padding: spacing.md, gap: spacing.md,paddingBottom:spacing.lg, },
  label: { ...typography.label },
});
