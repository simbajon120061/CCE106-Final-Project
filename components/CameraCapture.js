import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export default function CameraCapture({ visible, onCapture, onClose }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("back");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      visible &&
      permission &&
      !permission.granted &&
      permission.canAskAgain
    ) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  async function takePicture() {
    if (!cameraRef.current || busy) return;

    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        exif: false,
      });

      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } catch (error) {
      console.warn("Could not take picture", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
          />
        ) : (
          <View style={styles.center}>
            <Ionicons
              name="camera-outline"
              size={44}
              color={colors.goldLight}
            />
            <Text style={styles.message}>
              Camera permission is needed to take a photo.
            </Text>
            <Pressable
              onPress={requestPermission}
              style={styles.permissionButton}
            >
              <Text style={styles.permissionText}>
                Allow camera
              </Text>
            </Pressable>
          </View>
        )}

        {/* TOP BAR */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.roundButton}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* BOTTOM CONTROLS */}
        {permission?.granted ? (
          <View style={styles.bottomBar}>
            <View style={styles.sideSlot} />

            <Pressable
              onPress={takePicture}
              disabled={busy}
              style={({ pressed }) => [
                styles.shutterOuter,
                pressed && styles.shutterPressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </Pressable>

            <Pressable
              onPress={() =>
                setFacing((current) =>
                  current === "back" ? "front" : "back"
                )
              }
              hitSlop={12}
              style={[styles.roundButton, styles.sideSlot]}
            >
              <Ionicons
                name="camera-reverse-outline"
                size={24}
                color="#fff"
              />
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },

  message: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },

  permissionButton: {
    backgroundColor: colors.goldLight,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },

  permissionText: {
    color: colors.navy,
    fontWeight: "900",
    fontSize: 14,
  },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 44,
    paddingHorizontal: 18,
    flexDirection: "row",
  },

  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sideSlot: {
    width: 46,
    height: 46,
  },

  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  shutterPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },

  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
});