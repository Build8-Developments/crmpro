export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const MAIL_QUEUE = 'mail';
export const MAIL_JOB_ATTEMPTS = 5;
