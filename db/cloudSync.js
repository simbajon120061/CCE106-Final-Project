import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirebaseAuth } from "@/firebaseConfig";
import { syncLocalDataToFirestore } from "@/db/firestore";

const SYNC_DELAY_MS = 800;
const MAX_TIMER_DELAY_MS = 2_147_000_000;
const DEFAULT_BACKUP_INTERVAL_HOURS = 12;
const BACKUP_SETTINGS_KEY = "track-and-tally:backup-settings:";
const LAST_CLOUD_BACKUP_KEY = "track-and-tally:last-cloud-backup:";
const listeners = new Set();
const syncStates = new Map();
const scheduledJobs = new Map();
const activeJobs = new Map();
const periodicBackups = new Map();
const lastSuccessfulBackups = new Map();

function clearPeriodicTimer(watcher) {
  if (watcher.timer) {
    clearTimeout(watcher.timer);
    watcher.timer = null;
  }
}

function armPeriodicBackup(watcher, delayOverride) {
  clearPeriodicTimer(watcher);
  if (!watcher.active) return;

  const elapsed = watcher.lastSuccessAt
    ? Date.now() - watcher.lastSuccessAt
    : 0;
  const delay =
    delayOverride ??
    Math.max(0, watcher.intervalMs - elapsed);
  const dueAt = Date.now() + delay;

  watcher.timer = setTimeout(async () => {
    watcher.timer = null;
    if (!watcher.active || AppState.currentState !== "active") return;
    if (Date.now() < dueAt) {
      armPeriodicBackup(watcher, dueAt - Date.now());
      return;
    }

    try {
      const state = await syncLinkedStore(watcher.db, watcher.localUserId);
      if (state.status === "synced") {
        armPeriodicBackup(watcher);
      } else {
        armPeriodicBackup(watcher, watcher.intervalMs);
      }
    } catch (error) {
      console.error("Scheduled cloud backup failed:", error);
      armPeriodicBackup(watcher, watcher.intervalMs);
    }
  }, Math.min(delay, MAX_TIMER_DELAY_MS));
}

function intervalFromSettings(stored) {
  if (!stored) return DEFAULT_BACKUP_INTERVAL_HOURS;
  const settings = JSON.parse(stored);
  if (settings.schedule === "custom") {
    const customHours = Number(settings.customHours);
    return Number.isFinite(customHours) &&
      customHours >= 1 &&
      Number.isFinite(customHours * 60 * 60 * 1000)
      ? customHours
      : DEFAULT_BACKUP_INTERVAL_HOURS;
  }
  const hours = Number(settings.schedule);
  return hours === 8 || hours === 12
    ? hours
    : DEFAULT_BACKUP_INTERVAL_HOURS;
}

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
      const backedUpAt = Date.parse(result.backedUpAt);
      if (Number.isFinite(backedUpAt)) {
        lastSuccessfulBackups.set(userId, backedUpAt);
        const watcher = periodicBackups.get(userId);
        if (watcher) {
          watcher.lastSuccessAt = backedUpAt;
          armPeriodicBackup(watcher);
        }
        AsyncStorage.setItem(
          `${LAST_CLOUD_BACKUP_KEY}${userId}`,
          String(backedUpAt)
        ).catch((error) => {
          console.error("Could not save last cloud backup time:", error);
        });
      }
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

export function configureCloudBackupInterval(db, localUserId, intervalHours) {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  if (
    localUserId == null ||
    !Number.isFinite(intervalHours) ||
    intervalHours < 1 ||
    !Number.isFinite(intervalMs)
  ) {
    return;
  }

  const userId = String(localUserId);
  const watcher = periodicBackups.get(userId);
  if (!watcher) return;

  watcher.db = db;
  watcher.intervalMs = intervalMs;
  watcher.intervalConfigured = true;
  armPeriodicBackup(watcher);
}

export function watchCloudSyncOnForeground(db, localUserId) {
  if (localUserId == null) return () => {};

  const userId = String(localUserId);
  const priorWatcher = periodicBackups.get(userId);
  if (priorWatcher) {
    priorWatcher.active = false;
    clearPeriodicTimer(priorWatcher);
  }

  const watcher = {
    db,
    localUserId,
    intervalMs: DEFAULT_BACKUP_INTERVAL_HOURS * 60 * 60 * 1000,
    intervalConfigured: false,
    lastSuccessAt: lastSuccessfulBackups.get(userId) ?? null,
    timer: null,
    active: true,
  };
  periodicBackups.set(userId, watcher);

  AsyncStorage.getItem(`${BACKUP_SETTINGS_KEY}${userId}`)
    .then((stored) => {
      if (!watcher.active || watcher.intervalConfigured) return;
      watcher.intervalMs =
        intervalFromSettings(stored) * 60 * 60 * 1000;
      armPeriodicBackup(watcher);
    })
    .catch((error) => {
      console.error("Could not load cloud backup interval:", error);
    });

  AsyncStorage.getItem(`${LAST_CLOUD_BACKUP_KEY}${userId}`)
    .then((stored) => {
      if (!watcher.active || watcher.lastSuccessAt != null) return;
      const timestamp = Number(stored);
      if (Number.isFinite(timestamp) && timestamp > 0) {
        watcher.lastSuccessAt = timestamp;
        lastSuccessfulBackups.set(userId, timestamp);
      }
      armPeriodicBackup(watcher);
    })
    .catch((error) => {
      console.error("Could not load last cloud backup time:", error);
      armPeriodicBackup(watcher);
    });

  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      scheduleCloudSync(db, localUserId);
      const elapsed = watcher.lastSuccessAt
        ? Date.now() - watcher.lastSuccessAt
        : 0;
      armPeriodicBackup(
        watcher,
        Math.max(SYNC_DELAY_MS, watcher.intervalMs - elapsed)
      );
    }
  });
  return () => {
    subscription.remove();
    watcher.active = false;
    clearPeriodicTimer(watcher);
    if (periodicBackups.get(userId) === watcher) {
      periodicBackups.delete(userId);
    }
  };
}
