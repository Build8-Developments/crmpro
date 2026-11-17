/**
 * Builds a wa.me link. Local numbers (leading 0) get the workspace's country
 * dial code — Egypt (20) until tenant settings provide one.
 */
export function toWhatsAppUrl(phone: string, defaultDialCode = "20"): string {
  let digits = phone.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = `${defaultDialCode}${digits.slice(1)}`;
  }

  return `https://wa.me/${digits.replace(/\D/g, "")}`;
}
