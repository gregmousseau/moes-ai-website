import { Resend } from "resend";
import { buildOnboardingEmail } from "../templates/onboarding-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Moe's AI <noreply@mail.moes.ai>";

export interface OnboardingEmailData {
  recipientEmail: string;
  recipientName: string;
  dashboardUrl: string;
  gatewayToken: string;
  instanceIp: string;
  plan: string;
}

export async function sendOnboardingEmail(data: OnboardingEmailData) {
  const html = buildOnboardingEmail(data);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.recipientEmail,
    subject: "Your Moe's AI assistant is ready!",
    html,
  });

  if (error) {
    throw new Error(`Failed to send onboarding email: ${error.message}`);
  }
}
