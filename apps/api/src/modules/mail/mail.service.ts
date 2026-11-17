import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { createTransport, type Transporter } from 'nodemailer';
import { BullService } from '../jobs/bull/bull.service';
import { MAIL_JOB_ATTEMPTS, MAIL_QUEUE, type MailMessage } from './mail.types';

/**
 * Outbound email. `send` only enqueues; a BullMQ worker delivers with
 * retries so a flaky SMTP server never fails the user's request.
 * MAIL_TRANSPORT=log prints the message instead of sending (dev/test).
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
        `Email to ${job?.data.to ?? 'unknown'} failed (attempt ${job?.attemptsMade ?? '?'}): ${error.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.queue) {
      // Not bootstrapped (e.g. scripts): deliver inline.
      await this.deliver(message);
      return;
    }

    await this.queue.add('send', message, {
      attempts: MAIL_JOB_ATTEMPTS,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: 100,
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

  /** Absolute link into the web app, e.g. `/reset-password?token=…`. */
  webUrl(path: string): string {
    const base =
      this.config.get<string>('mail.appWebUrl') ?? 'http://localhost:3001';
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
}
