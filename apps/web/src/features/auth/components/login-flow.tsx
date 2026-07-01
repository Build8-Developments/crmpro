"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CredentialsStep } from "@/features/auth/components/credentials-step";
import { WorkspaceStep } from "@/features/auth/components/workspace-step";
import { useLogin } from "@/features/auth/hooks/use-auth-actions";
import { useWorkspaceLookup } from "@/features/auth/hooks/use-workspace-lookup";
import { authToast } from "@/features/auth/utils/auth-toast";
import { normalizeWorkspaceSlug } from "@/features/auth/utils/workspace-slug";

type LoginStep = "workspace" | "credentials";

export function LoginFlow() {
  const [step, setStep] = useState<LoginStep>("workspace");
  const [slugInput, setSlugInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { status, workspace } = useWorkspaceLookup(slugInput);
  const { login, isSubmitting } = useLogin();

  const handleContinue = () => {
    if (workspace) {
      authToast.dismissSignIn();
      setStep("credentials");
    }
  };

  const handleBack = () => {
    authToast.dismissSignIn();
    setPassword("");
    setStep("workspace");
  };

  const handleLogin = async () => {
    if (!workspace) return;

    await login({
      tenantSlug: workspace.slug,
      email: email.trim(),
      password,
    });
  };

  return (
    <div className="relative grid [&>*]:col-start-1 [&>*]:row-start-1">
      <div
        className={cn(
          "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          step === "workspace"
            ? "relative z-10 translate-x-0 scale-100 opacity-100"
            : "pointer-events-none absolute inset-x-0 top-0 -translate-x-3 scale-[0.98] opacity-0",
        )}
      >
        <WorkspaceStep
          slugInput={slugInput}
          onSlugChange={(value) => setSlugInput(normalizeWorkspaceSlug(value))}
          status={status}
          workspace={workspace}
          onContinue={handleContinue}
        />
      </div>

      <div
        className={cn(
          "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          step === "credentials"
            ? "relative z-10 translate-x-0 scale-100 opacity-100"
            : "pointer-events-none absolute inset-x-0 top-0 translate-x-3 scale-[0.98] opacity-0",
        )}
      >
        {workspace && (
          <CredentialsStep
            workspace={workspace}
            email={email}
            password={password}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onBack={handleBack}
            onSubmit={() => void handleLogin()}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
