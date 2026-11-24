import { ForbiddenException } from '@nestjs/common';
import {
  buildWorkspaceUrl,
  parseWorkspaceUrlTemplate,
  workspaceSlugFromHost,
  workspaceSlugFromOrigin,
  type WorkspaceUrlTemplate,
} from '@crmpro/shared/workspaces';
import {
  assertRequestFromWorkspace,
  isAllowedSocketOrigin,
  requestWorkspaceSlug,
} from './workspace-origin';

function template(value: string): WorkspaceUrlTemplate {
  const parsed = parseWorkspaceUrlTemplate(value);
  if (!parsed) throw new Error(`bad template ${value}`);
  return parsed;
}

const production = template('https://{slug}.nomow.app');
const staging = template('https://{slug}-staging.nomow.app');
const development = template('http://{slug}.localhost:3001');

describe('workspace URL templates', () => {
  it('accepts a whole label or a label with a suffix', () => {
    expect(
      parseWorkspaceUrlTemplate('https://{slug}.nomow.app'),
    ).not.toBeNull();
    expect(
      parseWorkspaceUrlTemplate('https://{slug}-staging.nomow.app/'),
    ).not.toBeNull();
    expect(
      parseWorkspaceUrlTemplate('http://{slug}.localhost:3001'),
    ).not.toBeNull();
  });

  it('rejects paths, missing {slug} and partial labels', () => {
    expect(
      parseWorkspaceUrlTemplate('https://{slug}.nomow.app/app'),
    ).toBeNull();
    expect(parseWorkspaceUrlTemplate('https://nomow.app')).toBeNull();
    expect(parseWorkspaceUrlTemplate('https://x{slug}.nomow.app')).toBeNull();
    expect(parseWorkspaceUrlTemplate('https://{slug}x.nomow.app')).toBeNull();
    expect(parseWorkspaceUrlTemplate('ftp://{slug}.nomow.app')).toBeNull();
  });

  it('builds links on the workspace host', () => {
    expect(buildWorkspaceUrl(staging, 'acme-x7k2', '/login')).toBe(
      'https://acme-x7k2-staging.nomow.app/login',
    );
    expect(buildWorkspaceUrl(development, 'prime-estates', 'leads')).toBe(
      'http://prime-estates.localhost:3001/leads',
    );
  });
});

describe('workspaceSlugFromOrigin', () => {
  it('reads the slug of a workspace host', () => {
    expect(
      workspaceSlugFromOrigin('https://acme-x7k2.nomow.app', production),
    ).toBe('acme-x7k2');
    expect(
      workspaceSlugFromOrigin('https://acme-x7k2-staging.nomow.app', staging),
    ).toBe('acme-x7k2');
    expect(
      workspaceSlugFromOrigin(
        'http://prime-estates.localhost:3001',
        development,
      ),
    ).toBe('prime-estates');
  });

  it('ignores the apex, platform hosts and other environments', () => {
    expect(workspaceSlugFromOrigin('https://nomow.app', production)).toBeNull();
    expect(
      workspaceSlugFromOrigin('https://admin.nomow.app', production),
    ).toBeNull();
    expect(
      workspaceSlugFromOrigin('https://admin-staging.nomow.app', staging),
    ).toBeNull();
    expect(
      workspaceSlugFromOrigin('https://staging.nomow.app', staging),
    ).toBeNull();
    expect(
      workspaceSlugFromOrigin('https://acme-x7k2.nomow.app', staging),
    ).toBeNull();
  });

  it('rejects look-alikes, deeper hosts, other schemes and ports', () => {
    for (const origin of [
      'https://evil-nomow.app',
      'https://evilnomow.app',
      'https://acme-x7k2.nomow.app.evil.com',
      'https://a.acme-x7k2.nomow.app',
      'http://acme-x7k2.nomow.app',
      'https://acme--x7k2.nomow.app',
      'https://acme-x7k2.nomow.app:8443',
      'https://acme-x7k2.nomow.app/path',
      'null',
    ]) {
      expect(workspaceSlugFromOrigin(origin, production)).toBeNull();
    }
    expect(
      workspaceSlugFromOrigin('http://prime.localhost:3000', development),
    ).toBeNull();
  });

  it('reads hosts case-insensitively and ignores a trailing dot', () => {
    expect(workspaceSlugFromHost('ACME-X7K2.nomow.app.', production)).toBe(
      'acme-x7k2',
    );
  });
});

describe('assertRequestFromWorkspace', () => {
  it('allows the workspace of the calling host', () => {
    expect(() =>
      assertRequestFromWorkspace(
        { origin: 'https://acme-x7k2.nomow.app' },
        production,
        'ACME-x7k2',
      ),
    ).not.toThrow();
  });

  it("refuses another workspace from this workspace's host", () => {
    expect(() =>
      assertRequestFromWorkspace(
        { origin: 'https://acme-x7k2.nomow.app' },
        production,
        'other-a1b2',
      ),
    ).toThrow(ForbiddenException);
  });

  it('leaves requests without a workspace origin unbound', () => {
    expect(() =>
      assertRequestFromWorkspace({}, production, 'other-a1b2'),
    ).not.toThrow();
    expect(() =>
      assertRequestFromWorkspace(
        { origin: 'https://nomow.app' },
        production,
        'other-a1b2',
      ),
    ).not.toThrow();
    expect(
      requestWorkspaceSlug({ origin: 'https://acme-x7k2.nomow.app' }, null),
    ).toBeNull();
  });
});

describe('isAllowedSocketOrigin', () => {
  const exact = ['https://nomow.app'];

  it('accepts exact entries and every workspace host', () => {
    expect(isAllowedSocketOrigin('https://nomow.app', exact, production)).toBe(
      true,
    );
    expect(
      isAllowedSocketOrigin('https://acme-x7k2.nomow.app', exact, production),
    ).toBe(true);
  });

  it('refuses other browser origins, including platform hosts', () => {
    expect(
      isAllowedSocketOrigin('https://evil.example', exact, production),
    ).toBe(false);
    expect(
      isAllowedSocketOrigin('https://admin.nomow.app', exact, production),
    ).toBe(false);
    expect(isAllowedSocketOrigin('https://acme-x7k2.nomow.app', [], null)).toBe(
      false,
    );
  });

  it('lets clients without an Origin through to token auth', () => {
    expect(isAllowedSocketOrigin(undefined, [], null)).toBe(true);
  });
});
