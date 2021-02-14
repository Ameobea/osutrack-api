import * as Sentry from '@sentry/node';

import { loadConf } from './conf';
import { initExpress } from './webserver';

import { createConnPool } from './dbUtil';

Sentry.init({
  dsn: 'https://24c652a768df4eb096ad392b0ccc6bce@sentry.ameo.design/7',
  tracesSampleRate: 0.1,
});

const init = async () => {
  const conf = await loadConf();
  console.log('Loaded config');

  console.log('Creating connection pool...');
  const pool = createConnPool(conf);
  console.log('Created connection pool');

  initExpress(pool);
};

init();
