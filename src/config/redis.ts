import Bull from 'bull';

const REDIS_BROKER_URL = process.env.REDIS_BROKER_URL || 'redis://localhost:6379';

const defaultJobOptions: Bull.JobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
};

export const userEventsQueue = new Bull('user-events', REDIS_BROKER_URL, {
  defaultJobOptions,
});

userEventsQueue.on('error', (err) => {
  console.error('[redis] Error en queue user-events:', err.message);
});
