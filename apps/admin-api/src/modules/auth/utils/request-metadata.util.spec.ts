import type { Request } from 'express';
import { extractRequestSecurityMetadata } from './request-metadata.util';

describe('extractRequestSecurityMetadata', () => {
  it('ignores client-sent forwarding and geo headers', () => {
    const req = {
      ip: '198.51.100.7',
      socket: { remoteAddress: '10.0.0.2' },
      headers: {
        'x-forwarded-for': '203.0.113.99, 198.51.100.7',
        'x-country': 'XX',
        'x-city': 'Nowhere',
        'cf-ipcountry': 'EG',
      },
    } as unknown as Request;

    expect(extractRequestSecurityMetadata(req)).toMatchObject({
      ipAddress: '198.51.100.7',
      country: 'EG',
      city: null,
    });
  });
});
