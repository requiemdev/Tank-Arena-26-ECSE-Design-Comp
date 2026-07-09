# ECSE Edge Tank Server

MVP for a local-router tank game:

- Browser controller at `http://<router-ip>:8080/controller`
- WebSocket edge route at `ws://<router-ip>:8080/connect`
- Robot client connects as a tank and receives normalized `{ throttle, steering, fire, seq, ts }` commands
- Match results queue locally in SQLite and sync to Supabase when internet is available

## Run on the Local Router

```sh
npm install
npm run dev
```

Open `http://<router-ip>:8080/controller` from a phone or laptop on the same Wi-Fi.

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
  "seq": 12,
  "ts": 1800000000000
}
```
