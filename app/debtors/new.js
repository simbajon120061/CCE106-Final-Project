import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Button from "@/components/Button";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { createDebtor } from "@/db/database";

export default function NewDebtorScreen() {
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

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert("Name required", "Please enter the customer's full name.");
      return;
    }

    setSaving(true);
    try {
      const id = await createDebtor(db, {
        full_name: fullName.trim(),
        contact_number: contact.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        credit_limit: Number(creditLimit) || 0,
        id_photo_uri: idPhotoUri,
      });
      router.replace(`/debtors/${id}`);
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
        <Text style={styles.title}>New debtor profile</Text>
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
        <Field label="Valid ID photo">
          <IdPhotoPicker idPhotoUri={idPhotoUri} {...photoHandlers} />
        </Field>

        <Button title="Save debtor" onPress={handleSave} loading={saving} />
      </ScrollView>
      <BottomNav activeTab="debtors" />
    </SafeAreaView>
  );
}

export function useIdPhotoHandlers(setIdPhotoUri) {
  async function onTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Camera access is required to take an ID photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setIdPhotoUri(result.assets[0].uri);
    }
  }

  async function onPickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Photo library access is required to select an ID photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setIdPhotoUri(result.assets[0].uri);
    }
  }

  function onRemovePhoto() {
    Alert.alert("Remove ID photo?", "This will remove the attached ID photo.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setIdPhotoUri(null) },
    ]);
  }

  return { onTakePhoto, onPickPhoto, onRemovePhoto };
}

export function DebtorFields(props) {
  return (
    <>
      <Field label="Full name *">
        <TextInput
          value={props.fullName}
          onChangeText={props.setFullName}
          placeholder="e.g. Maria Santos"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Field>
      <Field label="Contact number">
        <TextInput
          value={props.contact}
          onChangeText={props.setContact}
          placeholder="09XX XXX XXXX"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          style={styles.input}
        />
      </Field>
      <Field label="Address">
        <TextInput
          value={props.address}
          onChangeText={props.setAddress}
          placeholder="House no., street, barangay"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Field>
      <Field label="Notes">
        <TextInput
          value={props.notes}
          onChangeText={props.setNotes}
          placeholder="Optional notes about this customer"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textArea]}
          multiline
        />
      </Field>
      <Field label="Credit limit">
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

export function IdPhotoPicker({ idPhotoUri, onTakePhoto, onPickPhoto, onRemovePhoto }) {
  if (idPhotoUri) {
    return (
      <View style={styles.photoWrap}>
        <Image source={{ uri: idPhotoUri }} style={styles.photoPreview} />
        <View style={styles.photoActions}>
          <Pressable style={styles.photoButton} onPress={onTakePhoto}>
            <Text style={styles.photoButtonText}>Retake</Text>
          </Pressable>
          <Pressable style={styles.photoButton} onPress={onPickPhoto}>
            <Text style={styles.photoButtonText}>Change</Text>
          </Pressable>
          <Pressable style={[styles.photoButton, styles.photoRemove]} onPress={onRemovePhoto}>
            <Text style={[styles.photoButtonText, styles.photoRemoveText]}>Remove</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.photoActions}>
      <Pressable style={styles.photoAddButton} onPress={onTakePhoto}>
        <Ionicons name="camera-outline" size={18} color={colors.navy} />
        <Text style={styles.photoButtonText}>Take Photo</Text>
      </Pressable>
      <Pressable style={styles.photoAddButton} onPress={onPickPhoto}>
        <Ionicons name="image-outline" size={18} color={colors.navy} />
        <Text style={styles.photoButtonText}>Choose</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
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
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  photoWrap: { gap: spacing.sm },
  photoPreview: {
    width: "100%",
    height: 180,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  photoActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  photoButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.navy,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  photoAddButton: {
    flex: 1,
    minHeight: 58,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoButtonText: {
    color: colors.navy,
    fontWeight: "700",
    fontSize: 13,
  },
  photoRemove: { borderColor: colors.danger },
  photoRemoveText: { color: colors.danger },
});
