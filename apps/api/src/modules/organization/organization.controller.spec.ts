import { PERMISSIONS } from '@crmpro/shared/auth';
import { PERMISSIONS_METADATA_KEY } from '../../common/auth';
import { OrganizationController } from './organization.controller';

const requiredPermissions = (handler: keyof OrganizationController) =>
  Reflect.getMetadata(
    PERMISSIONS_METADATA_KEY,
    OrganizationController.prototype[handler],
  ) as string[] | undefined;

describe('OrganizationController permissions', () => {
  it.each([
    'updateOrganization',
    'updateSettings',
    'requestLogoUpload',
    'completeLogoUpload',
    'removeLogo',
  ] as const)('%s requires settings.manage', (handler) => {
    expect(requiredPermissions(handler)).toEqual([
      PERMISSIONS.SETTINGS_MANAGE,
    ]);
  });

  it('usage requires settings.read', () => {
    expect(requiredPermissions('getUsage')).toEqual([
      PERMISSIONS.SETTINGS_READ,
    ]);
  });

  it.each(['getOrganization', 'getSettings'] as const)(
    '%s is open to every signed-in member',
    (handler) => {
      expect(requiredPermissions(handler)).toBeUndefined();
    },
  );
});
