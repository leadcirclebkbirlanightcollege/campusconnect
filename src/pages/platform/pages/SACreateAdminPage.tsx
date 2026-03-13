/**
 * SACreateAdminPage — Thin wrapper routing to the Admins page with create dialog intent.
 */
import { Navigate } from "react-router-dom";
export default function SACreateAdminPage() {
  return <Navigate to="/platform/admin-control/admins?action=create" replace />;
}
