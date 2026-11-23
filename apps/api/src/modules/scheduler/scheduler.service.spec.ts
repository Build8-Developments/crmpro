const redisMock = {
  set: jest.fn(),
  eval: jest.fn(),
  on: jest.fn(),
  quit: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => redisMock),
}));

import { SchedulerService } from './scheduler.service';

describe('SchedulerService', () => {
  const bull = {
    getConnectionOptions: jest.fn(() => ({ host: 'localhost', port: 6379 })),
    getPrefix: jest.fn(() => 'bull'),
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects duplicate job names', () => {
    const service = new SchedulerService(bull as never);
    const job = { name: 'x', everyMs: 1000, run: jest.fn() };
    service.register(job);
    expect(() => service.register(job)).toThrow('already registered');
  });

  it('claims with SET NX EX and releases only its own token', async () => {
    const service = new SchedulerService(bull as never);
    redisMock.set.mockResolvedValueOnce('OK');

    const claim = await service.claim('stats:daily:pass:t:2026-11-17', 600);

    expect(redisMock.set).toHaveBeenCalledWith(
      'scheduler:claim:stats:daily:pass:t:2026-11-17',
      expect.any(String),
      'EX',
      600,
      'NX',
    );
    const token = redisMock.set.mock.calls[0][1] as string;
    await claim!.release();
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('del'"),
      1,
      'scheduler:claim:stats:daily:pass:t:2026-11-17',
      token,
    );
  });

  it('returns null when someone else holds the claim', async () => {
    const service = new SchedulerService(bull as never);
    redisMock.set.mockResolvedValueOnce(null);

    await expect(service.claim('k', 60)).resolves.toBeNull();
  });
});
