import type { Request } from 'express';
import { extractLoginSessionMetadata } from './request-metadata.util';

describe('extractLoginSessionMetadata', () => {
  it('records the proxy-resolved client IP, not a client-sent X-Forwarded-For', () => {
    const req = {
      ip: '198.51.100.7',
      socket: { remoteAddress: '10.0.0.2' },
      headers: {
        'x-forwarded-for': '203.0.113.99, 198.51.100.7',
        'user-agent': 'jest',
      },
    } as unknown as Request;

    expect(extractLoginSessionMetadata(req)).toEqual({
      deviceName: null,
      ipAddress: '198.51.100.7',
      userAgent: 'jest',
    });
  });
});
