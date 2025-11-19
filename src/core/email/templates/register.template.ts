export function signup(firstName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Welcome to Qkly, ${firstName}! 🎉</h2>
      <p>
        We're excited to have you on board.  
        Your journey with Qkly starts now — let’s make things faster, easier, and smarter.
      </p>
      <p>
        If you have any questions, we're always here to help.
      </p>
      <p style="margin-top: 20px;">Cheers,<br/>The Qkly Team</p>
    </div>
  `;
}
