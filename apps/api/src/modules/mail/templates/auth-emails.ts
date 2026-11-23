import { escapeHtml, renderEmail } from './layout';

export function passwordResetEmail(params: {
  name: string;
  workspaceName: string;
  url: string;
  expiresInMinutes: number;
}) {
  const name = escapeHtml(params.name);
  const workspace = escapeHtml(params.workspaceName);

  return {
    subject: `إعادة تعيين كلمة المرور · Reset your password — ${params.workspaceName}`,
    ...renderEmail({
      heading: { ar: 'إعادة تعيين كلمة المرور', en: 'Reset your password' },
      body: {
        ar: [
          `مرحبًا ${name}،`,
          `تلقّينا طلبًا لإعادة تعيين كلمة المرور لحسابك في مساحة العمل «${workspace}».`,
          `الرابط صالح لمدة ${params.expiresInMinutes} دقيقة ويُستخدم مرة واحدة فقط.`,
          'إذا لم تطلب ذلك فتجاهل هذه الرسالة، ولن يتغيّر شيء.',
        ],
        en: [
          `Hi ${name},`,
          `We received a request to reset the password for your account in the "${workspace}" workspace.`,
          `The link is valid for ${params.expiresInMinutes} minutes and works once.`,
          "If you didn't request this, ignore this email — nothing will change.",
        ],
      },
      action: {
        url: params.url,
        label: { ar: 'تعيين كلمة مرور جديدة', en: 'Set a new password' },
      },
      footer: {
        ar: 'لأمانك، سيتم تسجيل خروجك من جميع الأجهزة بعد تغيير كلمة المرور.',
        en: "For your security you'll be signed out of all devices after the change.",
      },
    }),
  };
}

export function inviteEmail(params: {
  name: string;
  inviterName: string;
  workspaceName: string;
  url: string;
  expiresInDays: number;
}) {
  const name = escapeHtml(params.name);
  const inviter = escapeHtml(params.inviterName);
  const workspace = escapeHtml(params.workspaceName);

  return {
    subject: `دعوة للانضمام · You're invited to ${params.workspaceName} on Nomow`,
    ...renderEmail({
      heading: {
        ar: `دعوة للانضمام إلى ${workspace}`,
        en: `Join ${workspace} on Nomow`,
      },
      body: {
        ar: [
          `مرحبًا ${name}،`,
          `دعاك ${inviter} للانضمام إلى فريق «${workspace}» على نومو.`,
          `اختر كلمة مرور لتفعيل حسابك. الدعوة صالحة لمدة ${params.expiresInDays} أيام.`,
        ],
        en: [
          `Hi ${name},`,
          `${inviter} invited you to join the "${workspace}" team on Nomow.`,
          `Choose a password to activate your account. The invitation is valid for ${params.expiresInDays} days.`,
        ],
      },
      action: {
        url: params.url,
        label: { ar: 'قبول الدعوة', en: 'Accept invitation' },
      },
      footer: {
        ar: 'إذا لم تكن تتوقع هذه الدعوة يمكنك تجاهلها.',
        en: "If you weren't expecting this invitation you can ignore it.",
      },
    }),
  };
}

export function notificationEmail(params: {
  title: string;
  message: string;
  url: string;
}) {
  const title = escapeHtml(params.title);
  const message = escapeHtml(params.message);

  return {
    subject: params.title,
    ...renderEmail({
      heading: { ar: title, en: title },
      body: { ar: [message], en: [] },
      action: {
        url: params.url,
        label: { ar: 'فتح نومو', en: 'Open Nomow' },
      },
      footer: {
        ar: 'يمكنك إيقاف رسائل البريد من الإعدادات ← الإشعارات.',
        en: 'Turn these emails off in Settings → Notifications.',
      },
    }),
  };
}
