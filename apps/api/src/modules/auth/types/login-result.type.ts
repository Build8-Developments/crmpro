import { SanitizedUser } from './sanitized-user.type';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: SanitizedUser;
}
