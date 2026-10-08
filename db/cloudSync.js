import { AppState } from "react-native";
import { getFirebaseAuth } from "@/firebaseConfig";
import { syncLocalDataToFirestore } from "@/db/firestore";

const SYNC_DELAY_MS = 800;
const listeners = new Set();
const syncStates = new Map();
const scheduledJobs = new Map();
const activeJobs = new Map();

function publish(localUserId, state) {
  syncStates.set(String(localUserId), state);
  listeners.forEach((listener) => listener(localUserId, state));
}

export function getCloudSyncState(localUserId) {
  return syncStates.get(String(localUserId)) ?? { status: "idle" };
}

export function subscribeCloudSync(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function syncLinkedStore(db, localUserId) {
  if (localUserId == null) {
    throw new Error("A local store account is required before cloud sync.");
  }

  const userId = String(localUserId);
  const activeJob = activeJobs.get(userId);
  if (activeJob) return activeJob.promise;

  const cancellation = { requested: false };
  const job = (async () => {
    try {
      const localUser = await db.getFirstAsync(
        "SELECT firebase_uid, phone_number, store_name, owner_name FROM users WHERE id = ?",
        [localUserId]
      );
      const firebaseUser = getFirebaseAuth().currentUser;

      if (!localUser?.firebase_uid) {
        const state = { status: "local-only" };
        publish(localUserId, state);
        return state;
      }

      if (!firebaseUser || firebaseUser.uid !== localUser.firebase_uid) {
        const state = { status: "needs-sign-in" };
        publish(localUserId, state);
        return state;
      }

      publish(localUserId, { status: "syncing" });
      const result = await syncLocalDataToFirestore(db, localUserId, {
        phoneNumber: localUser.phone_number,
        storeName: localUser.store_name,
        ownerName: localUser.owner_name,
      }, cancellation);
      const state = { status: "synced", ...result };
      publish(localUserId, state);
      return state;
    } catch (error) {
      if (error?.code === "cloud-sync/cancelled") {
        const state = { status: "cancelled" };
        publish(localUserId, state);
        return state;
      }
      const state = {
        status: "failed",
        message: error?.message || "Cloud sync failed.",
        failedAt: new Date().toISOString(),
      };
      publish(localUserId, state);
      throw error;
    }
  })();

  activeJobs.set(userId, { promise: job, cancellation });
  try {
    return await job;
  } finally {
    activeJobs.delete(userId);
  }
}

export function cancelCloudSync(localUserId) {
  if (localUserId == null) return false;

  const userId = String(localUserId);
  const scheduledJob = scheduledJobs.get(userId);
  if (scheduledJob) {
    clearTimeout(scheduledJob);
    scheduledJobs.delete(userId);
  }

  const activeJob = activeJobs.get(userId);
  if (activeJob) {
    activeJob.cancellation.requested = true;
    publish(localUserId, { status: "cancelling" });
    return true;
  }

  if (scheduledJob) {
    publish(localUserId, { status: "cancelled" });
    return true;
  }

  return false;
}

export function scheduleCloudSync(db, localUserId) {
  if (localUserId == null) return;

  const userId = String(localUserId);
  const priorTimer = scheduledJobs.get(userId);
  if (priorTimer) clearTimeout(priorTimer);

  publish(localUserId, { status: "queued" });
  const timer = setTimeout(() => {
    scheduledJobs.delete(userId);
    if (activeJobs.has(userId)) {
      scheduleCloudSync(db, localUserId);
      return;
    }
    syncLinkedStore(db, localUserId).catch((error) => {
      console.error("Automatic cloud sync failed:", error);
    });
  }, SYNC_DELAY_MS);
  scheduledJobs.set(userId, timer);
}

export function retryCloudSync(db, localUserId) {
  if (localUserId == null) return;
  const userId = String(localUserId);
  const priorTimer = scheduledJobs.get(userId);
  if (priorTimer) {
    clearTimeout(priorTimer);
    scheduledJobs.delete(userId);
  }
  syncLinkedStore(db, localUserId).catch((error) => {
    console.error("Cloud sync retry failed:", error);
  });
}

export function watchCloudSyncOnForeground(db, localUserId) {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active" && localUserId != null) {
      scheduleCloudSync(db, localUserId);
    }
  });
  return () => subscription.remove();
}
