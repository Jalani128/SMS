import nodemailer, { Transporter } from 'nodemailer';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let transporterInstance: Transporter | null = null;

export const initMailer = (): Transporter => {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  transporterInstance = transporter;
  logger.info(`[Mailer] Mail service configured with host: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
  return transporter;
};

export const verifyMailerConnection = async (): Promise<boolean> => {
  if (!transporterInstance) {
    initMailer();
  }

  try {
    if (env.SMTP_USER && env.SMTP_PASS) {
      await transporterInstance!.verify();
      logger.info('[Mailer] SMTP connection verified successfully.');
      return true;
    } else {
      logger.info('[Mailer] SMTP credentials omitted in development; running in stub mode.');
      return false;
    }
  } catch (error: any) {
    logger.warn(`[Mailer] SMTP connection warning: ${error.message}`);
    return false;
  }
};

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export const sendEmail = async (options: SendMailOptions): Promise<{ messageId: string; previewUrl?: string | false }> => {
  if (!transporterInstance) {
    initMailer();
  }

  // Disaster Recovery Quarantine Mode: suppress outbound emails during restore verification
  if (process.env.DR_QUARANTINE_MODE === 'true') {
    logger.info(`[Mailer:DR-Quarantine] Outbound email suppressed during recovery verification to: ${options.to} | Subject: "${options.subject}"`);
    return {
      messageId: `quarantine_${Date.now()}`,
      previewUrl: false,
    };
  }

  const mailOptions = {
    from: options.from || `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    logger.info(`[Mailer:Stub] Email simulation to: ${options.to} | Subject: "${options.subject}"`);
    return {
      messageId: `stub_${Date.now()}`,
      previewUrl: false,
    };
  }

  const info = await transporterInstance!.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
};
