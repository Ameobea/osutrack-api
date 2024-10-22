import * as Sentry from '@sentry/node';

import { loadConf } from './conf';
import { initExpress } from './webserver';
import { createConnPool } from './dbUtil';

Sentry.init({
  dsn: 'https://5ff5ab6141e202e155c2c3a5055c7b9d@sentry.ameo.design/13',
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
