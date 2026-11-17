import { inviteEmail, passwordResetEmail } from './auth-emails';

describe('auth email templates', () => {
  it('escapes user-controlled values in HTML', () => {
    const email = inviteEmail({
      name: '<script>alert(1)</script>',
      inviterName: 'Sara "Boss"',
      workspaceName: 'Prime & Co',
      url: 'https://app.test/accept-invite?token=abc',
      expiresInDays: 7,
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('Prime &amp; Co');
    expect(email.text).toContain('https://app.test/accept-invite?token=abc');
  });

  it('is bilingual with an RTL Arabic block', () => {
    const email = passwordResetEmail({
      name: 'Mona',
      workspaceName: 'Prime',
      url: 'https://app.test/reset-password?token=x',
      expiresInMinutes: 30,
    });

    expect(email.html).toContain('dir="rtl"');
    expect(email.html).toContain('إعادة تعيين كلمة المرور');
    expect(email.html).toContain('Reset your password');
    expect(email.subject).toContain('Reset your password');
  });
});
