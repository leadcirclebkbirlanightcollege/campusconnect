import { Navigate } from "react-router-dom";

/**
 * PwaInstallPage — Deactivated in production.
 *
 * Campus Connect does not promote PWA installation prompts.
 * Navigating to this route automatically redirects back to the main app.
 */
export default function PwaInstallPage() {
  return <Navigate to="/app" replace />;
}
