import { authApi, type MessageResponse } from '@/api/auth'

export async function resendVerificationAction(
  email: string,
  turnstileToken?: string | null
): Promise<MessageResponse> {
  return authApi.resendVerificationEmail(email, turnstileToken)
}
