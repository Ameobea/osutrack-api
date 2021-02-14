import mysql from 'mysql';

import type { Conf } from './conf';

export const createConnPool = (conf: Conf) =>
  mysql.createPool({
    connectionLimit: 10,
    host: conf.database.host,
    user: conf.database.username,
    password: conf.database.password,
    database: conf.database.database,
    charset: 'utf8mb4',
    bigNumberStrings: true,
    supportBigNumbers: true,
  });

export const query = async <T>(
  conn: mysql.Pool | mysql.PoolConnection,
  query: string,
  values?: any[]
): Promise<T[]> =>
  new Promise((resolve, reject) =>
    conn.query(query, values, (err, res) => {
      if (!!err) {
        reject(err);
        return;
      }

      resolve(res as T[]);
    })
  );

export const update = (
  conn: mysql.Pool | mysql.PoolConnection,
  query: string,
  values?: any[]
): Promise<{ fieldCount: number; affectedRows: number; message: string; changedRows: number }> =>
  new Promise((resolve, reject) =>
    conn.query(query, values, (err, res) => {
      if (!!err) {
        reject(err);
        return;
      }

      resolve(res);
    })
  );

export const insert = (
  conn: mysql.Pool | mysql.PoolConnection,
  query: string,
  values: any[]
): Promise<unknown> =>
  new Promise((resolve, reject) =>
    conn.query(query, values, (err, res) => {
      if (!!err) {
        reject(err);
        return;
      }

      resolve(res);
    })
  );

export const _delete = (
  conn: mysql.Pool | mysql.PoolConnection,
  query: string,
  values: any[]
): Promise<{ affectedRows: number }> =>
  new Promise((resolve, reject) =>
    conn.query(query, values, (err, res) => {
      if (!!err) {
        reject(err);
        return;
      }

      resolve(res);
    })
  );

export const getConn = (pool: mysql.Pool): Promise<mysql.PoolConnection> =>
  new Promise((resolve, reject) =>
    pool.getConnection((err, res) => {
      if (!!err) {
        reject(err);
        return;
      }

      resolve(res);
    })
  );

export const rollback = (conn: mysql.PoolConnection): Promise<void> =>
  new Promise((resolve, reject) =>
    conn.rollback(err => {
      if (!!err) {
        reject(err);
      } else {
        resolve();
      }
    })
  );

export const commit = (conn: mysql.PoolConnection): Promise<void> =>
  new Promise((resolve, reject) =>
    conn.commit(async err => {
      if (!!err) {
        await rollback(conn);
        reject(err);
      } else {
        resolve();
      }
    })
  );

export interface User {
  osu_id: number;
  username: string;
}

export const getUser = async (pool: mysql.Pool, userID: number): Promise<User | undefined> => {
  const user = await query<User>(pool, 'SELECT * FROM `users` WHERE osu_id = ?', [userID]);
  return user[0];
};

export interface Update {
  count300: number;
  count100: number;
  count50: number;
  playcount: number;
  ranked_score: number;
  total_score: number;
  pp_rank: number;
  level: number;
  pp_raw: number;
  accuracy: number;
  count_rank_ss: number;
  count_rank_s: number;
  count_rank_a: number;
  timestamp: Date;
}

export interface HiscoreUpdate {
  beatmap_id: number;
  score: number;
  pp: number;
  mods: number;
  rank: string;
  score_time: Date;
  update_time: Date;
}
