export interface AccessTokenPayload {
  sub: string;
  roleId: string;
  sessionId: string;
}

export interface AuthenticatedAdmin {
  id: string;
  roleId: string;
  sessionId: string;
}

export interface RequestSecurityMetadata {
  ipAddress: string | null;
  userAgent: string | null;
  fingerprint: string | null;
  deviceName: string | null;
  country: string | null;
  city: string | null;
}

export interface SanitizedAdmin {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  isActive: boolean;
  lastLoginAt: Date | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  admin: SanitizedAdmin;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface SessionListItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  deviceName: string | null;
  country: string | null;
  city: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

export interface CreateSessionInput {
  adminId: string;
  hashedRefreshToken: string;
  expiresAt: Date;
  metadata: RequestSecurityMetadata;
}
