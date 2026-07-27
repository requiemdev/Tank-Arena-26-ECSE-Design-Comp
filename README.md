# ECSE Edge Tank Server

MVP for a local-router tank game:

- Browser controller at `http://<router-ip>:8080/controller`
- Live spectator display at `http://<router-ip>:8080/spectator`
- WebSocket edge route at `ws://<router-ip>:8080/connect`
- Robot client connects as a tank and receives normalized `{ throttle, steering, fire, left, right, seq, ts }` commands
- Match results queue locally in SQLite and sync to Supabase when internet is available

## Run on the Local Router

```sh
npm install
cp .env.example .env
npm run dev
```

Open `http://<router-ip>:8080/controller` from each player's phone or laptop on the same Wi-Fi.
Open `http://<router-ip>:8080/spectator` on the shared display for the live VS view.

On Windows PowerShell, create the local `.env` file with:

```powershell
Copy-Item .env.example .env
```

If `npm install` prints an `allow-scripts` warning for `better-sqlite3` or `esbuild`, approve those install scripts and rebuild before starting the server:

```sh
npm approve-scripts --allow-scripts-pending
npm rebuild
npm run dev
```

The dev server should keep running and print a `Server listening at http://0.0.0.0:8080` log. If it exits immediately with `node: .env: not found`, create `.env` from `.env.example` first.

## Supabase Setup

Create the leaderboard table before enabling cloud sync:

1. Open Supabase dashboard.
2. Go to SQL Editor.
3. Run `supabase/schema.sql`.

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Match results stay in local SQLite until Supabase sync succeeds.
Only matches with a winner are added to the leaderboard. The leaderboard ranks those matches by shortest game duration; legacy rows without a recorded duration are retained but not shown.

## Connect a Robot

On the robot or a process that can reach the robot hardware API:

```sh
EDGE_WS_URL=ws://<router-ip>:8080/connect PLAYER=p1 npm run robot
```

By default the robot client logs commands for bench testing. To forward commands to hardware, expose an HTTP endpoint on the robot and set:

```sh
ROBOT_COMMAND_URL=http://127.0.0.1:5000/drive EDGE_WS_URL=ws://<router-ip>:8080/connect PLAYER=p1 npm run robot
```

The hardware endpoint receives JSON like:

```json
{
  "throttle": 0.8,
  "steering": -0.4,
  "fire": false,
  "left": true,
  "right": false,
  "seq": 12,
  "ts": 1800000000000
}
```

When the robot detects that its own tank was hit, send the event through the same tank WebSocket connection:

```json
{
  "type": "hit",
  "direction": "front"
}
```

The server uses the connected tank's player slot to reduce that tank's health and update the opposing player's score. Direction is logged for debugging only, so every direction counts as a regular hit.
