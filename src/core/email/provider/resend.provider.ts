
import {EmailProvider } from "../interfaces/mail.interfaces";
import { Resend } from "resend";

export class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendEmail({ to, from, subject, html }) {
    return this.resend.emails.send({ to, from, subject, html });
  }
}
