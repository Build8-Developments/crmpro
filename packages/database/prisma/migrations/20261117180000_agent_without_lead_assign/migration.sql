-- Assignment and transfers are the sales manager's job: system Agent roles lose
-- lead.assign. Custom roles keep whatever the tenant gave them.
DELETE FROM "RolePermission" rp
USING "Role" r, "Permission" p
WHERE rp."roleId" = r."id"
  AND rp."permissionId" = p."id"
  AND r."isSystem" = true
  AND r."name" = 'Agent'
  AND r."deletedAt" IS NULL
  AND p."key" = 'lead.assign';
