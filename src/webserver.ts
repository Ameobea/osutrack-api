import express, { Response } from 'express';
import mysql from 'mysql';
import fetch from 'node-fetch';

import { CONF } from './conf';
import { query, Update } from './dbUtil';

const validateUser = (
  user: undefined | string | string[] | { [key: string]: any }
): number | undefined => {
  if (typeof user !== 'string') {
    return undefined;
  }
  const parsedUser = +user;
  if (Number.isNaN(parsedUser) || parsedUser <= 0 || parseInt(user) !== parsedUser) {
    return undefined;
  }
  return parsedUser;
};

const validateMode = (
  mode: undefined | string | string[] | { [key: string]: any }
): number | undefined => {
  if (typeof mode !== 'string') {
    return undefined;
  }
  if (mode !== '0' && mode !== '1' && mode !== '2' && mode !== '3') {
    return undefined;
  }
  return +mode;
};

const validateLimit = (
  limit: undefined | string | string[] | { [key: string]: any }
): number | undefined => {
  if (limit === undefined) {
    return 100;
  }
  if (typeof limit !== 'string') {
    return undefined;
  }
  const parsed = +limit;
  if (Math.round(parsed) !== parsed || parsed <= 0 || parsed > 10_000) {
    return undefined;
  }
  return parsed;
};

const validateDate = (
  date: undefined | string | string[] | { [key: string]: any }
): Date | undefined => {
  if (typeof date !== 'string') {
    return undefined;
  }
  const d = new Date(date);
  if (Number.isNaN(d.getDate())) {
    return undefined;
  }
  return d;
};

enum UserMode {
  ID,
  Username,
}

const validateUserMode = (
  userMode: undefined | string | string[] | { [key: string]: any }
): UserMode => {
  if (typeof userMode !== 'string') {
    return UserMode.ID;
  }
  switch (userMode) {
    case 'id':
      return UserMode.ID;
    case 'username':
      return UserMode.Username;
    default:
      return UserMode.ID;
  }
};

const getIDFromUsername = async (
  pool: mysql.Pool,
  username: string,
  gameMode: number
): Promise<{ didUpdate: boolean; id: number } | undefined> => {
  const queryRes = await query<{ osu_id: number }>(
    pool,
    'SELECT osu_id FROM `users` WHERE `username` = ?',
    [username]
  );
  if (queryRes.length === 1) {
    return { didUpdate: false, id: queryRes[0].osu_id };
  }

  try {
    console.log(`User ${username} not found in DB; fetching from base osu!track API...`);
    const res = await fetch(
      `https://ameobea.me/osutrack/api/get_user.php?user=${username}&mode=${gameMode}`
    );
    if (!res.ok) {
      const text = await res.text();
      console.error('Failed to fetch from base osu!track API: ', text);
      return undefined;
    }

    const resJson = await res.json();
    if (!resJson.exists) {
      return undefined;
    }
    return { didUpdate: true, id: parseInt(resJson.user, 10) };
  } catch (err) {
    console.error('Failed to fetch from base osu!track API: ', err);
    return undefined;
  }
};

const invalidUser = (res: Response<any>) =>
  res
    .status(400)
    .send(
      'Invalid or missing `user` param; must be a valid osu! user ID (default) or username (if `userMode` is set to `username`)'
    );

const invalidMode = (res: Response<any>) =>
  res
    .status(400)
    .send(
      'Invalid or missing `mode` param; must be a valid osu! game mode; 0=osu!, 1=taiko, 2=ctb, 3=mania'
    );

const invalidLimit = (res: Response<any>) =>
  res
    .status(400)
    .send(
      'Invalid `limit` param; must be a non-zero integer greater than 0 and less than or equal to 10000'
    );

export const initExpress = (pool: mysql.Pool) => {
  const app = express();

  app.post('/update', async (req, res) => {
    const { user: rawUserID, mode } = req.query;

    const parsedUserID = validateUser(rawUserID);
    if (!parsedUserID) {
      return invalidUser(res);
    }
    const parsedMode = validateMode(mode);
    if (parsedMode === undefined) {
      return invalidMode(res);
    }

    try {
      // Let the existing osu!track API endpoint handle this
      const rawProxyRes = await fetch(
        `https://ameobea.me/osutrack/api/get_changes.php?mode=${parsedMode}&id=${parsedUserID}`
      );
      if (rawProxyRes.status === 404) {
        return res.status(404).json({ error: 'User not found' });
      } else if (rawProxyRes.status !== 200) {
        throw await rawProxyRes.text();
      }
      const proxyRes = await rawProxyRes.text();

      try {
        const parsed = JSON.parse(proxyRes);
        res.status(200).json(parsed);
      } catch (err) {
        console.error('Non-JSON response from base osu!track API: ', proxyRes);
        res.status(500).send('Internal error when updating user');
      }
    } catch (err) {
      console.error('Failed to fetch from base osu!track API: ', err);
      res.status(500).send('Internal error when updating user');
    }
  });

  app.get('/stats_history', async (req, res) => {
    const { user: rawUserID, mode, from: rawFrom, to: rawTo } = req.query;

    const parsedUserID = validateUser(rawUserID);
    if (!parsedUserID) {
      return invalidUser(res);
    }
    const parsedMode = validateMode(mode);
    if (parsedMode === undefined) {
      return invalidMode(res);
    }

    const from = validateDate(rawFrom);
    const to = validateDate(rawTo);

    try {
      const queryRes = await query<Update>(
        pool,
        'SELECT count300, count100, count50, playcount, ranked_score, total_score, pp_rank, level, pp_raw, accuracy, count_rank_ss, count_rank_s, count_rank_a, timestamp FROM `updates` WHERE `mode` = ? AND user = ? AND `timestamp` >= ? AND `timestamp` <= ? ORDER BY `timestamp` ASC',
        [parsedMode, parsedUserID, from ?? new Date('2000-01-01'), to ?? new Date('2800-01-01')]
      );
      res.status(200).json(queryRes);
    } catch (err) {
      console.error('DB error: ', err);
      res.sendStatus(500);
    }
  });

  app.get('/hiscores', async (req, res) => {
    const {
      user: rawUser,
      mode: gameMode,
      from: rawFrom,
      to: rawTo,
      userMode: rawUserMode,
    } = req.query;

    const parsedGameMode = validateMode(gameMode) ?? 0;
    const userMode = validateUserMode(rawUserMode);
    let didUpdate = false;
    const parsedUserID = await (async () => {
      if (userMode === undefined || userMode === UserMode.ID) {
        return validateUser(rawUser);
      }
      if (typeof rawUser !== 'string') {
        return undefined;
      }
      if (userMode === UserMode.Username) {
        const userIDRes = await getIDFromUsername(pool, rawUser, parsedGameMode);
        if (!userIDRes) {
          return undefined;
        }
        didUpdate = userIDRes.didUpdate;
        return userIDRes.id;
      }

      return undefined;
    })();
    if (!parsedUserID) {
      return invalidUser(res);
    }

    if (parsedGameMode === undefined) {
      return invalidMode(res);
    }

    const from = validateDate(rawFrom);
    const to = validateDate(rawTo);

    try {
      const getHiscoresFromDB = () =>
        query<Update>(
          pool,
          'SELECT beatmap_id, score, pp, mods, rank, score_time, update_time FROM `hiscore_updates` WHERE `mode` = ? AND user = ? AND `score_time` >= ? AND `score_time` <= ? ORDER BY `score_time` ASC',
          [
            parsedGameMode,
            parsedUserID,
            from ?? new Date('2000-01-01'),
            to ?? new Date('2800-01-01'),
          ]
        );
      let queryRes = await getHiscoresFromDB();
      if (!didUpdate && queryRes.length === 0) {
        console.log(
          'Empty query result and `updateIfEmpty` is set to true; updating user id=' + parsedUserID
        );
        await fetch(
          `https://ameobea.me/osutrack/api/get_changes.php?mode=${parsedGameMode}&id=${parsedUserID}`
        );
        queryRes = await getHiscoresFromDB();
      }

      res.status(200).json(queryRes);
    } catch (err) {
      console.error('DB error: ', err);
      res.sendStatus(500);
    }
  });

  app.get('/peak', async (req, res) => {
    const { user: rawUserID, mode } = req.query;

    const parsedUserID = validateUser(rawUserID);
    if (!parsedUserID) {
      return invalidUser(res);
    }
    const parsedMode = validateMode(mode);
    if (parsedMode === undefined) {
      return invalidMode(res);
    }

    try {
      const queryRes = await query<{
        best_global_rank: number | null | undefined;
        best_accuracy: number | null | undefined;
        best_rank_timestamp: Date | null | undefined;
        best_acc_timestamp: Date | null | undefined;
      }>(
        pool,
        `
            SELECT
                MIN(pp_rank) AS best_global_rank,
                (SELECT MAX(timestamp) FROM updates WHERE user = ? AND mode = ? AND pp_rank = (SELECT MIN(pp_rank) FROM updates WHERE user = ? AND mode = ?)) AS best_rank_timestamp,
                MAX(accuracy) AS best_accuracy,
                (SELECT MAX(timestamp) FROM updates WHERE user = ? AND mode = ? AND accuracy = (SELECT MAX(accuracy) FROM updates WHERE user = ? AND mode = ?)) AS best_acc_timestamp
            FROM
                updates
            WHERE
                user = ? AND mode = ?`,
        [
          parsedUserID,
          parsedMode,
          parsedUserID,
          parsedMode,
          parsedUserID,
          parsedMode,
          parsedUserID,
          parsedMode,
          parsedUserID,
          parsedMode,
        ]
      );
      res.status(200).json(queryRes);
    } catch (err) {
      console.error('DB error: ', err);
      res.sendStatus(500);
    }
  });

  app.get('/bestplays', async (req, res) => {
    const { mode, from: rawFrom, to: rawTo, limit: rawLimit } = req.query;

    const parsedMode = validateMode(mode);
    if (parsedMode === undefined) {
      return invalidMode(res);
    }

    const limit = validateLimit(rawLimit);
    if (limit === undefined) {
      return invalidLimit(res);
    }

    const from = validateDate(rawFrom);
    const to = validateDate(rawTo);

    try {
      const queryRes = await query<Update>(
        pool,
        'SELECT user, beatmap_id, score, pp, mods, rank, score_time, update_time FROM `hiscore_updates` WHERE `mode` = ? AND `score_time` >= ? AND `score_time` <= ? ORDER BY `pp` DESC LIMIT ?',
        [parsedMode, from ?? new Date('2000-01-01'), to ?? new Date('2800-01-01'), limit]
      );
      res.status(200).json(queryRes);
    } catch (err) {
      console.error('DB error: ', err);
      res.sendStatus(500);
    }
  });

  app.listen(CONF.webserver.port, () => {
    console.log('Webserver listening on port ' + CONF.webserver.port);
  });
};
