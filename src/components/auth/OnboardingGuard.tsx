/**
 * OnboardingGuard — disabled.
 *
 * Phase 6 simplified student auth: default password is `student`,
 * no forced password reset, no blocking onboarding flow.
 * This guard is now a pass-through. The /app/onboarding route remains
 * available for voluntary profile completion.
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
