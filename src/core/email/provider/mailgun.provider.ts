import { EmailProvider } from "../interfaces/mail.interfaces";
import formData from "form-data";
import Mailgun from "mailgun.js";

export class MailgunProvider implements EmailProvider {
  private mg;
  private domain: string;

  constructor(apiKey: string, domain: string) {
    const mailgun = new Mailgun(formData);
    this.mg = mailgun.client({ username: "api", key: apiKey });
    this.domain = domain;
  }

  async sendEmail({ to, from, subject, html }) {
    return this.mg.messages.create(this.domain, {
      to,
      from,
      subject,
      html,
    });
  }
}
