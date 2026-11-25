/** Field names of the demo request form (also the FormData keys). */
export const DEMO_FIELDS = {
  name: "name",
  phone: "phone",
  company: "company",
  teamSize: "teamSize",
  locale: "locale",
  requestId: "requestId",
  /** Honeypot: hidden from people, filled in by bots. */
  trap: "website",
} as const;

export const TEAM_SIZES = ["1-5", "6-15", "16-50", "50+"] as const;

export const UTM_FIELDS = ["utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent"] as const;

export type DemoFieldError = "name" | "phone" | "company";

export type DemoFormState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      /** Fields that failed validation; the form shows the localized message for each. */
      fieldErrors: DemoFieldError[];
      /** The request could not be delivered (network, config, upstream error). */
      failed: boolean;
      /** What the visitor typed, so a no-JS round trip keeps it. */
      values: { name: string; phone: string; company: string; teamSize: string };
    };
