/**
 * SACreateCollegePage — Redirects to colleges page (create is handled via dialog there).
 */
import { Navigate } from "react-router-dom";
export default function SACreateCollegePage() {
  return <Navigate to="/platform/admin-control/colleges?action=create" replace />;
}
