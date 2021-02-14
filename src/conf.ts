import fs from 'fs';

import toml from 'toml';

interface DbConf {
  host: string;
  username: string;
  password: string;
  database: string;
}

interface WebserverConf {
  port: number;
}

export interface Conf {
  database: DbConf;
  webserver: WebserverConf;
}

export let CONF: Conf = null as any;

export const loadConf = async () => {
  const fileContent = await new Promise<string>((resolve, reject) =>
    fs.readFile(process.env.CONF_FILE_PATH || './conf.toml', {}, (err, data) => {
      if (!!err) {
        console.error('Failed to read config file: ', err);
        reject(err);
        return;
      }
      resolve(data.toString());
    })
  );

  try {
    CONF = toml.parse(fileContent) as Conf;
    return CONF;
  } catch (err) {
    console.error('Failed to parse conf file: ', err);
    process.exit(1);
  }
};
