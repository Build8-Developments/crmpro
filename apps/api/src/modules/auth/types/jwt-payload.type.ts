export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  roleId: string;
  sessionId: string;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  roleId: string;
  sessionId: string;
}
