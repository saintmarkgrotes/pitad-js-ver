export function authErrorMessage(error) {
  const messages = {
    invalid_credentials: 'That email and password do not match. Please try again.',
    email_not_confirmed: 'Confirm your email before signing in. Use the verification option below.',
    user_already_exists: 'An account may already use this email. Try signing in or resetting your password.',
    over_email_send_rate_limit: 'Please wait a minute before requesting another email.',
    over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
    otp_expired: 'This code has expired or is invalid. Request a new code.',
    same_password: 'Choose a password different from your current password.',
    weak_password: 'Choose a stronger password with at least 12 characters.',
  };
  if (error?.issues) return error.issues[0]?.message || 'Please check your entries.';
  if (messages[error?.code]) return messages[error.code];
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) return 'Unable to connect. Check your connection and try again.';
  return 'We could not complete that request. Please try again. If it continues, check the project setup.';
}
