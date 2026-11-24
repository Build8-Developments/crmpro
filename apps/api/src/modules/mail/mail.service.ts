import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { createTransport, type Transporter } from 'nodemailer';
import { buildWorkspaceUrl } from '@crmpro/shared/workspaces';
import { workspaceUrlTemplate } from '../../common/http/workspace-origin';
import { BullService } from '../jobs/bull/bull.service';
import { MAIL_JOB_ATTEMPTS, MAIL_QUEUE, type MailMessage } from './mail.types';

/**
 * Outbound email. `send` only enqueues; a BullMQ worker delivers with retries
 * so a flaky SMTP server never fails the user's request.
 *
 * Messages can carry reset/invite links, so jobs are removed when they finish
 * — succeeded or finally failed — and failures are logged without content.
 * MAIL_TRANSPORT=log prints messages instead (development only; production
 * refuses to boot without smtp, see env.validation).
 */
@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private queue?: Queue<MailMessage>;
  private worker?: Worker<MailMessage>;
  private transporter?: Transporter;

  constructor(
    private readonly config: ConfigService,
    private readonly bullService: BullService,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('mail.transport') === 'smtp') {
      const user = this.config.get<string>('mail.smtpUser');
      this.transporter = createTransport({
        host: this.config.getOrThrow<string>('mail.smtpHost'),
        port: this.config.get<number>('mail.smtpPort'),
        secure: this.config.get<boolean>('mail.smtpSecure'),
        ...(user
          ? { auth: { user, pass: this.config.get<string>('mail.smtpPass') } }
          : {}),
      });
    }
    if (process.env.NODE_ENV === 'test') return;

    const connection = this.bullService.getConnectionOptions();
    const prefix = this.bullService.getPrefix();
    this.queue = new Queue<MailMessage>(MAIL_QUEUE, { connection, prefix });
    this.worker = new Worker<MailMessage>(
      MAIL_QUEUE,
      async (job) => this.deliver(job.data),
      { connection, prefix, concurrency: 2 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.warn(
        `Email "${job?.data.subject ?? '?'}" failed (attempt ${job?.attemptsMade ?? '?'} of ${MAIL_JOB_ATTEMPTS}): ${error.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.queue) {
      // Not bootstrapped (scripts, tests): deliver inline.
      await this.deliver(message);
      return;
    }
    await this.queue.add('send', message, {
      attempts: MAIL_JOB_ATTEMPTS,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  async deliver(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[mail:log] to=${message.to} subject="${message.subject}"\n${message.text}`,
      );
      return;
    }
    await this.transporter.sendMail({
      from: this.config.get<string>('mail.from'),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }

  /**
   * Absolute link into one workspace's own host (WORKSPACE_URL_TEMPLATE, e.g.
   * https://{slug}.nomow.app). Production requires the template; the single
   * web URL is only a fallback for tests and scripts.
   */
  workspaceUrl(slug: string, path: string): string {
    const template = workspaceUrlTemplate(this.config);
    return template
      ? buildWorkspaceUrl(template, slug, path)
      : this.webUrl(path);
  }

  /** Absolute link into the web app, e.g. `/reset-password?token=…`. */
  webUrl(path: string): string {
    const base =
      this.config.get<string>('mail.appWebUrl') ?? 'http://localhost:3001';
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
}
