# Tank Arena — Laser Tank Duels

**Winner of the Part III Engineering Excellence Award at the 2026 University of Auckland ECSE Design Competition.**

Tank Arena is a two-player tank duel game that combines custom 3D-printed tanks, ESP32 embedded firmware, electrical design, and a browser-based control experience. Players drive and fire from their phones while an edge server coordinates the match, validates gameplay, reports hits, and records completed results.

<img width="1787" height="1341" alt="image" src="https://github.com/user-attachments/assets/3cf303a9-b68a-4d62-8d2b-9e487abbabd8" />
<img width="2160" height="2880" alt="image" src="https://github.com/user-attachments/assets/6daca0da-4c86-4d6f-a143-70af546196b3" />
<img width="992" height="478" alt="image" src="https://github.com/user-attachments/assets/951309a1-e6d4-42d1-a328-169d7c46e153" />


## Project Key Points

This is a complete hardware–software product rather than a standalone robot or web demo:

- Two custom RC tanks communicate with the server over Wi-Fi and WebSockets.
- Players use responsive browser controllers instead of dedicated transmitters.
- The server owns the authoritative match state, including readiness, countdowns, movement, firing, health, scoring, and win conditions.
- Hit events from the tanks are sent back through the same WebSocket connection, keeping the game state synchronized.
- Completed games are queued locally in SQLite and synchronized to Supabase when connectivity is available.
- Spectator and leaderboard views make the system usable beyond the players themselves.

## System overview

1. Players open `/controller` on their phones, select a tank, and ready up.
2. Each ESP32 tank connects to `/connect?type=tank&player=p1|p2`.
3. The TypeScript/Fastify server broadcasts state and forwards normalized movement and firing commands to the correct tank.
4. The tanks detect laser hits and report them to the server, which applies damage and updates the score.
5. A decisive match ends when one tank reaches zero health. The result is persisted locally and can appear on the leaderboard.

The game lifecycle is explicitly modelled as `LOBBY → COUNTDOWN → ACTIVE → ENDED`, which keeps connection loss, invalid actions, and match completion predictable.

## Engineering highlights

- **Embedded systems:** ESP32 firmware for Wi-Fi, WebSocket communication, watchdog/reconnect behaviour, String parsing to encode/decode messages from server, interrupt handling for hit sensing, PWM outputs(For motor control and  IR emitter firing).
- **Real-time networking:** Persistent WebSocket connections for low-latency control and event delivery.
- **Authoritative game logic:** Server-side validation prevents the browser from directly deciding hits, health, scores, or winners.
- **Resilient operation:** Connection lifecycle handling, safe match termination, local SQLite queueing, and deferred cloud synchronization support unreliable competition-day networks.
- **Player-focused UX:** The controller exposes connection status, readiness, joystick movement, firing cooldown, health, score, and hit feedback at a glance.
- **End-to-end integration:** Mechanical fabrication, circuit simulation, firmware, backend services, and user interface are designed as one system.

## Hardware and design files

- [3D_Print](./3D_Print) — STL files for the tank body and supporting parts. The rigid components were printed in PLA; the wheel tracks were printed in flexible TPU.
- [Firmware](./Firmware) — ESP32 firmware for tank control, sensing, firing, and communication with the game server.
- [LTspice](./LTspice) — circuit simulations and supporting electrical-design work.
- [Altium](./dc_p3_t11) — PCB design for circuit.

## Software stack

| Area | Technologies |
| --- | --- |
| Embedded control | ESP32, C++, Arduino/PlatformIO |
| Game server | TypeScript, Node.js, Fastify, WebSockets |
| Player interface | HTML, CSS, JavaScript, responsive mobile UI |
| Persistence | SQLite offline queue, Supabase leaderboard |
| Mechanical design | 3D printing with PLA and TPU |
| Electrical design | Altium, LTspice |

## Running the software locally

```bash
npm install
npm run dev
```

Once the server is running, open the controller at:

```text
http://localhost:8080/controller
```

For a tank or robot client on the same network, replace the router/server address and choose `p1` or `p2`:

```bash
EDGE_WS_URL=ws://<router-ip>:8080/connect PLAYER=p1 npm run robot
```

The server address must be reachable by both phones and ESP32 boards. The exact firmware build and flashing instructions are documented with the source in [Firmware](./Firmware).
