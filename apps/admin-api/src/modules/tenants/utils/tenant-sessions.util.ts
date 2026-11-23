import type { Prisma } from '@crmpro/database';

/**
 * Revokes every live session of every user in the tenant. A session holds the
 * tenant user's (hashed) refresh token, and the tenant API checks the session
 * on every request, so this signs everyone out at once: refresh fails and
 * existing access tokens are refused.
 */
export async function revokeTenantUserSessionsInTx(
  tx: Prisma.TransactionClient,
  tenantId: string,
  revokedAt: Date = new Date(),
): Promise<number> {
  const result = await tx.userSession.updateMany({
    where: { revokedAt: null, user: { tenantId } },
    data: { revokedAt },
  });

  return result.count;
}
