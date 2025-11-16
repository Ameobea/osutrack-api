import rateLimit from 'express-rate-limit';

import type { Conf } from './conf';

const getIp = (req: any) => req.headers['x-forwarded-for'] || req.connection.remoteAddress;

const skipIfBathbot: rateLimit.Options['skip'] = (req, _res): boolean => {
  const userAgent = req.headers['user-agent'];
  if (!userAgent) {
    return false;
  }
  return userAgent.includes('bathbot-client');
};

export const buildRateLimiters = (CONF: Conf) => {
  const dbRateLimiter = rateLimit({
    windowMs: CONF.rate_limit?.db_ratelimit_window_ms ?? 60 * 1000,
    max: CONF.rate_limit?.db_ratelimit_max_requests ?? 600,
    keyGenerator: getIp,
    skip: skipIfBathbot,
  });

  const updateRateLimiter = rateLimit({
    windowMs: CONF.rate_limit?.update_ratelimit_window_ms ?? 60 * 1000,
    max: CONF.rate_limit?.update_ratelimit_max_requests ?? 5,
    keyGenerator: getIp,
    skip: skipIfBathbot,
  });

  const hiscoresRateLimiter = rateLimit({
    windowMs: CONF.rate_limit?.hiscores_ratelimit_window_ms ?? 60 * 1000,
    max: CONF.rate_limit?.hiscores_ratelimit_max_requests ?? 20,
    keyGenerator: getIp,
    skip: skipIfBathbot,
  });

  return { dbRateLimiter, updateRateLimiter, hiscoresRateLimiter };
};
