"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeams } from "@/features/teams/hooks";
import { useCheckEmail, useRoles } from "@/features/users/hooks";
import { useCreateUser } from "@/features/users/mutations";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import {
  isValidPassword,
  PASSWORD_HINT,
} from "@/features/users/utils/password";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePermissions } from "@/hooks/use-permissions";

export function CreateUserDialog() {
  const open = useUserUiStore((s) => s.createDialogOpen);
  const closeCreateDialog = useUserUiStore((s) => s.closeCreateDialog);
  const { can } = usePermissions();

  const handleClose = () => {
    closeCreateDialog();
  };

  if (!can("user.create")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>
            Create a team member with login credentials and a role.
          </DialogDescription>
        </DialogHeader>

        {open ? <CreateUserForm key="create-user" onClose={handleClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const { data: teams } = useTeams();
  const [teamId, setTeamId] = useState<string>("none");
  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = () => {
    const length = 12;
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const specials = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
    const all = lower + upper + numbers + specials;
    
    let pwd = lower[Math.floor(Math.random() * lower.length)] +
              upper[Math.floor(Math.random() * upper.length)] +
              numbers[Math.floor(Math.random() * numbers.length)] +
              specials[Math.floor(Math.random() * specials.length)];
              
    for (let i = 4; i < length; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }
    
    pwd = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    setPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
  };
  const debouncedEmail = useDebouncedValue(email.trim(), 400);
  const { data: emailCheck, isFetching: isCheckingEmail } = useCheckEmail(debouncedEmail);
  const emailAvailable = emailCheck?.available ?? true;

  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const debouncedEmailValid = EMAIL_REGEX.test(debouncedEmail);
  const emailValid = EMAIL_REGEX.test(email);

  const passwordValid = isValidPassword(password);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roleId || !passwordValid || !passwordsMatch || !emailAvailable || isCheckingEmail || !emailValid) return;

    await createUser.mutateAsync({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      roleId,
      ...(teamId !== "none" ? { teamId } : {}),
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user-full-name">Full name</Label>
        <Input
          id="user-full-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="user-email">Email</Label>
          {isCheckingEmail ? (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <AppIcons.loader className="size-3 animate-spin" /> Checking...
            </span>
          ) : debouncedEmail.length > 0 && !debouncedEmailValid && email === debouncedEmail ? (
            <span className="text-[10px] text-destructive flex items-center gap-1">
              <AppIcons.alertCircle className="size-3" /> Invalid email format
            </span>
          ) : !emailAvailable && email === debouncedEmail ? (
            <span className="text-[10px] text-destructive flex items-center gap-1">
              <AppIcons.alertCircle className="size-3" /> Email already in use
            </span>
          ) : emailAvailable && email === debouncedEmail && debouncedEmailValid ? (
            <span className="text-[10px] text-emerald-600 flex items-center gap-1">
              <AppIcons.check className="size-3" /> Available
            </span>
          ) : null}
        </div>
        <Input
          id="user-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="off"
          className={((!emailAvailable || (debouncedEmail.length > 0 && !debouncedEmailValid)) && email === debouncedEmail) ? "border-destructive focus-visible:ring-destructive" : ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-role">Role</Label>
        <Select value={roleId} onValueChange={setRoleId} disabled={rolesLoading}>
          <SelectTrigger id="user-role">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {(roles ?? []).map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {teams && teams.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="user-team">Team</Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger id="user-team">
              <SelectValue placeholder="No team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No team</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="user-password">Password</Label>
        <div className="relative">
          <Input
            id="user-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="new-password"
            className="pr-20"
          />
          <div className="absolute right-0 top-0 flex h-full items-center px-1 text-muted-foreground">
            <button
              type="button"
              onClick={generatePassword}
              className="flex h-full items-center justify-center px-2 hover:text-foreground"
              title="Generate password"
            >
              <AppIcons.refresh className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="flex h-full items-center justify-center px-2 hover:text-foreground"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <AppIcons.eyeOff className="size-4" />
              ) : (
                <AppIcons.eye className="size-4" />
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-confirm-password">Confirm password</Label>
        <Input
          id="user-confirm-password"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          autoComplete="new-password"
        />
        {confirmPassword && !passwordsMatch ? (
          <p className="text-xs text-destructive">Passwords do not match.</p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            createUser.isPending ||
            isCheckingEmail ||
            !emailAvailable ||
            !emailValid ||
            !roleId ||
            fullName.trim().length < 2 ||
            !passwordValid ||
            !passwordsMatch
          }
        >
          {createUser.isPending ? "Creating..." : "Create user"}
        </Button>
      </DialogFooter>
    </form>
  );
}
