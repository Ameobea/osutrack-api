# osu!track API

Exposes an API to [osu!track](https://ameobea.me/osutrack/) that allows data to be queried, users to be updated, and other things.

## Using the API

Anyone is free to use the API for any purpose, but please keep your traffic reasonable.  The one thing I request is that you do not use the API to scrape the full osu!track database or mass-update users.

If you've got a question about a particular use-case or need data or functionality that this API doesn't provide, you can join the osu!track developers Discord: https://discord.gg/gjzBzCVFmy  Feel free to @ me there (@ameo) and I'll answer any questions you have or help out if I can.

If you encounter any bugs or issues with the API, please do the same!

## Endpoints

The API is reachable at: https://osutrack-api.ameo.dev/

### Update User

`POST https://osutrack-api.ameo.dev/update?user={user}&mode={mode}`

* `user` is the user ID of the user you'd like to update
* `mode` is the gamemode you'd like to update; 0=osu!, 1=taiko, 2=ctb, 3=mania

#### Returns

This endpoint will return the difference in stats since the last update if successful:

```
{
  "username":"ameo",
  "mode":0,
  "playcount":0,
  "pp_rank":0,
  "pp_raw":0,
  "accuracy":0,
  "total_score":0,
  "ranked_score":0,
  "count300":0,
  "count50":0,
  "count100":0,
  "level":0,
  "count_rank_a":0,
  "count_rank_s":0,
  "count_rank_ss":0,
  "levelup":false, // whether or not the user leveled up since the last update
  "first":false, // whether this is the first update for the user, meaning that there was no previous update to compare to
  "exists":true, // whether the user exists or not; if this is false, check the user ID you provided
  // an array of new hiscores for the user
  "newhs": [
    {
      "beatmap_id":"33394",
      "score_id":"85808923",
      "score":"5720257",
      "maxcombo":"494",
      "count50":"0",
      "count100":"9",
      "count300":"350",
      "countmiss":"0",
      "countkatu":"8",
      "countgeki":"45",
      "perfect":"1",
      "enabled_mods":"8",
      "user_id":"131464",
      "date":"2010-04-22 08:25:22",
      "rank":"SH",
      "pp":"82.9195",
      "replay_available":"0",
      "ranking":0
    }
  ]
}
```

### Get all stats updates for user

`GET https://osutrack-api.ameo.dev/stats_history?user={user}&mode={mode}&from={from}&to={to}`

* `user` is the user ID of the user you'd like to update
* `mode` is the gamemode you'd like to update; 0=osu!, 1=taiko, 2=ctb, 3=mania
* `from` is optional, but if provided it is the start date of updates you'd like to retrieve in the format `YYYY-MM-DD` like `2020-01-01`
* `to` is optional, but if provided it is the end date of updates you'd like to retrieve in the format `YYYY-MM-DD` like `2021-01-01`

#### Returns

If successful, returns an array of updates for the user in the selected mode like this:

```
[
  {
    "count300":3788588,
    "count100":387592,
    "count50":42411,
    "playcount":23428,
    "ranked_score":"4306096061",
    "total_score":"19326454144",
    "pp_rank":79461,
    "level":99.1757,
    "pp_raw":4006.24,
    "accuracy":98.70355224609375,
    "count_rank_ss":31,
    "count_rank_s":408,
    "count_rank_a":568,
    "timestamp":"2021-02-04T23:24:42.000Z",
  }
]
```

### Get all recorded hiscores for user

`GET https://osutrack-api.ameo.dev/hiscores?user={user}&mode={mode}&from={from}&to={to}`

* `user` is the user ID of the user you'd like to update
* `mode` is the gamemode you'd like to update; 0=osu!, 1=taiko, 2=ctb, 3=mania
* `from` is optional, but if provided it is the start date of updates you'd like to retrieve in the format `YYYY-MM-DD` like `2020-01-01`
* `to` is optional, but if provided it is the end date of updates you'd like to retrieve in the format `YYYY-MM-DD` like `2021-01-01`

#### Returns

If successful, returns an array of all recorded hiscores for the user in the selected mode like this:

```
[
  {
    "beatmap_id":637549,
    "score":2423423,
    "pp":193.099,
    "mods":584, // Same format as osu! API: https://github.com/ppy/osu-api/wiki#mods
    "rank":"SH",
    "score_time":"2019-05-12T06:30:16.000Z", // Timestamp of when the play took place
    "update_time":"2019-05-12T06:30:40.000Z" // Timestamp of when osu!track recorded the play
  }
]
```

### Get the peak rank + accuracy for a user

`GET https://osutrack-api.ameo.dev/peak?user={user}&mode={mode}`

* `user` is the user ID of the user you'd like to update
* `mode` is the gamemode you'd like to update; 0=osu!, 1=taiko, 2=ctb, 3=mania

#### Returns

If successful, returns the best (lowest) global rank and accuracy for the user along with the timestamps at which they were at their best values:

```
[{
  "best_global_rank": 7381,
  "best_rank_timestamp": "2015-04-24T12:44:15.000Z",
  "best_accuracy": 99.46027374267578,
  "best_acc_timestamp": "2024-03-14T01:06:02.000Z"
}]
```

If user not found or no updates exist for the user, returns:

```
[{
  "best_global_rank": null,
  "best_rank_timestamp": null,
  "best_accuracy": null,
  "best_acc_timestamp": null
}]
```

### Get the best plays by pp for all users in a given mode

`GET https://osutrack-api.ameo.dev/bestplays?mode={mode}&from={from}&to={to}&limit={limit}`

* `mode` is the gamemode you'd like to retrieve best plays for; 0=osu!, 1=taiko, 2=ctb, 3=mania
* `from` is optional, but if provided it is the start date of scores you'd like to retrieve in the format `YYYY-MM-DD` like `2020-01-01`
* `to` is optional, but if provided it is the end date of scores you'd like to retrieve in the format `YYYY-MM-DD` like `2021-01-01`
* `limit` is how many scores you want to return, an optional number from 1 to 10000.  Scores are returned in descending order by pp value.

#### Returns

```

  {
    "user": 6447454,
    "beatmap_id": 111680,
    "score": 25571304,
    "pp": 1144.15,
    "mods": 88,
    "rank": "A",
    "score_time": "2021-01-07T11:16:59.000Z",
    "update_time": "2021-01-16T14:59:17.000Z"
  },
  {
    "user": 6447454,
    "beatmap_id": 1842043,
    "score": 63633373,
    "pp": 1092.05,
    "mods": 72,
    "rank": "SH",
    "score_time": "2021-01-12T07:25:34.000Z",
    "update_time": "2021-01-16T14:59:17.000Z"
  }
]
```
