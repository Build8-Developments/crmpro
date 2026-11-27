import { ConfigService } from '@nestjs/config';
import { RATE_LIMIT_CONFIG_KEYS } from '../common/rate-limit/rate-limit.constants';
import configuration from './configuration';

describe('configuration', () => {
  // The tenant and admin APIs share one Redis. Rate-limit keys are prefixed
  // with this name; if both fell back to the default they would share
  // counters and lock each other's sign-ins out.
  it('names this plane for rate-limit keys', () => {
    const config = new ConfigService(configuration());

    expect(config.get<string>(RATE_LIMIT_CONFIG_KEYS.plane)).toBe('api');
  });
});
