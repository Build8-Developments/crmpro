import { toast as sonner } from "sonner";

/**
 * App-wide toast helpers (Sonner).
 */
export const toast = {
  success(message: string, description?: string) {
    sonner.success(message, description ? { description } : undefined);
  },

  error(message: string, description?: string) {
    sonner.error(message, description ? { description } : undefined);
  },

  warning(message: string, description?: string) {
    sonner.warning(message, description ? { description } : undefined);
  },

  info(message: string, description?: string) {
    sonner.info(message, description ? { description } : undefined);
  },

  dismiss(toastId?: string | number) {
    sonner.dismiss(toastId);
  },
};
