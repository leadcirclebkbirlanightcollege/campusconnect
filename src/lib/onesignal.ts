import OneSignal from "react-onesignal";

type UserTags = {
  role: "student" | "admin" | "super_admin";
  college_id?: string | null;
  class_name?: string | null;
};

const ONE_SIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;
let initPromise: Promise<boolean> | null = null;

export function isOneSignalConfigured() {
  return Boolean(ONE_SIGNAL_APP_ID);
}

export async function initializeOneSignal(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!ONE_SIGNAL_APP_ID || typeof window === "undefined") return false;

    await OneSignal.init({
      appId: ONE_SIGNAL_APP_ID,
      notifyButton: { enable: true },
      autoResubscribe: true,
      serviceWorkerPath: "OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/" },
      allowLocalhostAsSecureOrigin: true,
    });

    return true;
  })();

  return initPromise;
}

export async function identifyOneSignalUser(userId: string, tags: UserTags) {
  const ready = await initializeOneSignal();
  if (!ready) return;

  await OneSignal.login(userId);
  await OneSignal.User.addTags({
    role: tags.role,
    ...(tags.college_id ? { college_id: tags.college_id } : {}),
    ...(tags.class_name ? { class_name: tags.class_name } : {}),
  });
}

export async function promptOneSignalSlidedown() {
  const ready = await initializeOneSignal();
  if (!ready) return;
  await OneSignal.Slidedown.promptPush();
}

export async function clearOneSignalUser() {
  const ready = await initializeOneSignal();
  if (!ready) return;
  await OneSignal.logout();
}
