import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import AccountSecuritySettings from "@/pages/settings/AccountSecuritySettings";

export default function AccountSecurityPage() {
  const navigate = useNavigate();

  return (
    <PageContainer size="tablet">
      <div className="py-4 space-y-6">
        <PageHeader
          title="Account Security"
          subtitle="Manage your authentication credentials, email, password, and two-factor security."
          back
          onBack={() => navigate(-1)}
        />
        <AccountSecuritySettings />
      </div>
    </PageContainer>
  );
}
