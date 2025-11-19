export interface EmailProvider {
  sendEmail(payload: {
    to: string | string[];
    from: string;
    subject: string;
    html: string;
  }): Promise<any>;
}