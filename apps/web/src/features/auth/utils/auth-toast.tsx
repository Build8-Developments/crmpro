import { createElement } from "react";
import { toast } from "sonner";
import { AppIcons } from "@/components/icons/app-icons";

const TOAST_ICON_PROPS = { className: "size-4", stroke: 2 } as const;

export const authToast = {
  signInFailed(message: string) {
    toast.error("Sign in failed", {
      id: "auth-sign-in",
      description: message,
      icon: createElement(AppIcons.alertCircle, TOAST_ICON_PROPS),
    });
  },

  signInSuccess(name: string) {
    toast.success("Welcome back", {
      id: "auth-sign-in",
      description: `Signed in as ${name}`,
      icon: createElement(AppIcons.check, TOAST_ICON_PROPS),
    });
  },

  signedOut() {
    toast.info("Signed out", {
      id: "auth-sign-out",
      description: "You have been logged out.",
      icon: createElement(AppIcons.logout, TOAST_ICON_PROPS),
    });
  },

  dismissSignIn() {
    toast.dismiss("auth-sign-in");
  },
};
