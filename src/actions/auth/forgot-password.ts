import { authApi, type MessageResponse } from '@/api/auth'

export async function forgotPasswordAction(
  email: string,
  frontend: 'main' | 'manage' | 'admin' = 'manage',
  turnstileToken?: string | null
): Promise<MessageResponse> {
  return authApi.forgotPassword(email, frontend, turnstileToken)
}
