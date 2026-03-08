import { useEffect, useRef } from "react";
import OneSignal from "react-onesignal";
import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string;

let initialized = false;

/**
 * Initialises OneSignal once per app session and sets user identity + tags
 * after authentication so the backend can target by role / college.
 */
export function useOneSignal() {
  const initRef = useRef(false);

  useEffect(() => {
    if (!ONESIGNAL_APP_ID || initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        if (!initialized) {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            // Slide-down in-app prompt for PWA / browsers
            promptOptions: {
              slidedown: {
                prompts: [
                  {
                    type: "push",
                    autoPrompt: true,
                    text: {
                      actionMessage:
                        "Enable notifications to stay updated on lectures, attendance & achievements.",
                      acceptButton: "Allow",
                      cancelButton: "Later",
                    },
                    delay: {
                      pageViews: 1,
                      timeDelay: 5,
                    },
                  },
                ],
              },
            },
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerParam: { scope: "/" },
            serviceWorkerPath: "OneSignalSDKWorker.js",
          });
          initialized = true;
        }

        // Wire up user identity and tags based on current Supabase session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await identifyUser(session.user.id);
        }

        // Re-identify on session changes (login / logout)
        supabase.auth.onAuthStateChange(async (_event, sess) => {
          if (sess?.user) {
            await identifyUser(sess.user.id);
          } else {
            // Logout — remove identity
            try {
              await OneSignal.logout();
            } catch {
              // ignore
            }
          }
        });
      } catch (err) {
        // OneSignal errors should never break the app
        console.warn("[OneSignal] init error", err);
      }
    };

    init();
  }, []);
}

async function identifyUser(userId: string) {
  try {
    // Set the Supabase user ID as the OneSignal External ID
    await OneSignal.login(userId);

    // Fetch role and college_id to set segmentation tags
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, college_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (roles) {
      await OneSignal.User.addTags({
        role: roles.role ?? "",
        college_id: roles.college_id ?? "",
      });
    }
  } catch (err) {
    console.warn("[OneSignal] identify error", err);
  }
}
