/**
 * English copy for the website. `ar.ts` must have the same shape (it is typed
 * as `Dictionary`). Copy rules live in docs/website/README.md: plain words,
 * short sentences, and claim only what the product does today.
 */
const en = {
  meta: {
    title: "Nomow · Every lead, followed through.",
    description:
      "Nomow is the CRM for real-estate sales teams in Egypt. Every lead gets an owner and a next step, and managers see who follows up. Coming soon.",
  },
  nav: {
    skip: "Skip to content",
    product: "Product",
    features: "Features",
    signIn: "Sign in",
    bookDemo: "Book a demo",
    switchLanguage: "عربي",
    switchLanguageLabel: "اقرأ الصفحة بالعربي",
    home: "Nomow home",
    menu: "Menu",
    closeMenu: "Close menu",
    language: "Language",
  },
  theme: {
    group: "Theme",
    system: "Match my device",
    light: "Light",
    dark: "Dark",
  },
  hero: {
    eyebrow: "Coming soon",
    meta: "CRM for real-estate sales teams in Egypt",
    title: ["every lead,", "followed through."],
    accent: "through.",
    lede: "Nomow gives every lead an owner and a next step with a date. Your agents know who to call today, and you see who's following up and who isn't.",
    primary: "Book a demo",
    existing: "Already using Nomow?",
    signIn: "Sign in",
    tour: {
      label: "Inside the dashboard",
      steps: [
        {
          title: "What needs you, first",
          text: "Overdue tasks, hot leads nobody has called and stuck deals, counted live at the top of the dashboard.",
        },
        {
          title: "Nudge in one click",
          text: "See who is behind and nudge them. The reminder lands at the top of their day.",
        },
        {
          title: "Deals that stopped moving",
          text: "Stuck and stale leads by stage, so nothing sits in Negotiation for a month.",
        },
        {
          title: "Money against target",
          text: "Revenue, commission and reservations this month, measured against your targets.",
        },
      ],
    },
    dashboardAlt:
      "The Nomow dashboard: overdue tasks, hot leads nobody has called, and stuck deals, listed by agent.",
  },
  problem: {
    label: "Why Nomow",
    title: "Most leads aren't lost. They're forgotten.",
    text: "A lead comes in from an ad. Someone saves it in a sheet, someone else messages them on WhatsApp, and a week later nobody knows who spoke to them last.",
    before: "Without Nomow",
    scattered: [
      "Sheet from last month",
      "Group chat, 214 unread",
      "Notebook on someone's desk",
      "Missed call, no callback",
    ],
    afterAlt: "An agent's next follow-up in Nomow: who, why, and buttons to call, WhatsApp or log it.",
    after: "With Nomow",
    afterText:
      "Every lead has one owner and one next step with a date. When it's due, it's at the top of the agent's day.",
  },
  product: {
    label: "Product",
    title: "This is {brand}.",
    lede: "Real screens from the app, with sample data.",
    sample: "Sample data",
    tabs: [
      {
        key: "today",
        label: "Today",
        caption: "Each agent opens Nomow to their day, in order: who to call, what's overdue, what's next.",
        alt: "An agent's Today page: the next follow-up, overdue tasks and this month's targets.",
      },
      {
        key: "dashboard",
        label: "Dashboard",
        caption: "Managers see what needs them now: overdue tasks, hot leads nobody called, deals that have stalled.",
        alt: "The manager dashboard with what needs attention now and this month's revenue against target.",
      },
      {
        key: "leads",
        label: "Leads",
        caption: "Every lead with its source, agent, next step and last contact. Overdue and never-contacted leads are one click away.",
        alt: "The leads list with source, agent, next step and last contact for each lead.",
      },
      {
        key: "deals",
        label: "Deals",
        caption: "Reservations and contracts with price and commission, by agent and project.",
        alt: "The deals list with reserved and contracted totals, prices and commissions.",
      },
      {
        key: "targets",
        label: "Targets",
        caption: "Monthly targets for each person and for the company, tracked as the month goes.",
        alt: "Monthly targets for deals, revenue, commission, interactions and visits, per person.",
      },
    ],
  },
  features: {
    label: "What's inside",
    title: "Built for how real-estate sales work in Egypt.",
    attention: {
      title: "Know what needs you now",
      text: "Overdue tasks, hot leads untouched for two days, deals stuck in a stage. Nudge the agent or reassign in one click.",
      alt: "The Needs attention section of the dashboard.",
    },
    performance: {
      title: "Every agent sees their own numbers",
      text: "Deals and revenue month by month, with personal bests. Numbers stay hidden until the agent chooses to show them.",
      alt: "An agent's deals and revenue over the last 12 months.",
    },
    views: {
      title: "See what's slipping",
      text: "Unassigned, no next step, overdue, never contacted, stale, stuck: each is one click on the leads list.",
      alt: "Quick filters on the leads list.",
    },
    projects: {
      title: "Projects, not unit lists",
      text: "Leads are tied to the projects you sell. No unit inventory to keep up to date.",
    },
    spend: {
      title: "Marketing spend",
      text: "Spend per lead source, and what each lead, visit and deal cost you.",
    },
    team: {
      title: "Roles and audit log",
      text: "Your own roles and permissions, and a record of who changed what.",
    },
  },
  demo: {
    label: "Book a demo",
    title: "Be one of the first agencies on Nomow.",
    text: "Leave your details and we'll call you to arrange a demo.",
    form: {
      name: "Your name",
      phone: "Mobile number",
      phoneHint: "We'll call you on this number.",
      company: "Company name",
      teamSize: "Sales team size",
      optional: "optional",
      teamSizes: [
        { value: "1-5", label: "1–5" },
        { value: "6-15", label: "6–15" },
        { value: "16-50", label: "16–50" },
        { value: "50+", label: "50+" },
      ],
      submit: "Request a demo",
      sending: "Sending…",
      privacy: "We only use your details to contact you about Nomow.",
      errors: {
        name: "Enter your name.",
        phone: "Enter a mobile number we can call.",
        company: "Enter your company name.",
        summary: "Please check the fields marked below.",
        failed: "We couldn't send your request. Please try again, or email us at",
      },
      success: {
        title: "Thanks, we've got it.",
        text: "We'll call you soon to arrange your demo.",
      },
    },
  },
  footer: {
    tagline: "CRM for real-estate sales teams in Egypt",
    rights: "All rights reserved.",
    contact: "Contact",
  },
  notFound: {
    title: "This page isn't here.",
    text: "The address may be wrong, or the page has moved.",
    back: "Back to the home page",
  },
};

export type Dictionary = typeof en;
export default en;
