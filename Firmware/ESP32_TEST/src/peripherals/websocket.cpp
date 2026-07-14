#include "websocket.h"



// ============================================================================
// WIFI CONFIG
// ============================================================================
const char *WIFI_SSID = "TankRouter";
const char *WIFI_PASSWORD = "WeLoveTanksPewPew";

const char *SERVER_HOST = "192.168.1.67";
const uint16_t SERVER_PORT = 8080;
const char *PLAYER_SLOT = "p1"; // Use "p1" or "p2".
const char *ROBOT_NAME = "esp32-tank";

WebSocketsClient webSocket;

void websocket_init(){
    Serial.begin(115200);
    delay(500);

    Serial.println();
    Serial.println("ESP32 tank listener starting");

    connectWiFi();
    configureWebSocket();   
}

void websocket_loop() {
  webSocket.loop();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[wifi] disconnected; reconnecting");
    connectWiFi();
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("[wifi] connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("[wifi] connected: ");
  Serial.println(WiFi.localIP());
}

void configureWebSocket() {
  String path = "/connect?type=tank&player=";
  path += PLAYER_SLOT;
  path += "&username=";
  path += ROBOT_NAME;

  Serial.print("[ws] connecting to ws://");
  Serial.print(SERVER_HOST);
  Serial.print(":");
  Serial.print(SERVER_PORT);
  Serial.println(path);

  webSocket.begin(SERVER_HOST, SERVER_PORT, path);
  webSocket.onEvent(handleWebSocketEvent);
  webSocket.setReconnectInterval(1000);
  webSocket.enableHeartbeat(15000, 3000, 2);
}

void handleWebSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[ws] disconnected");
      break;

    case WStype_CONNECTED:
      Serial.println("[ws] connected");
      webSocket.sendTXT("{\"type\":\"tank-listener-online\"}");
      break;

    case WStype_TEXT:
      Serial.print("[ws] message ");
      Serial.print(length);
      Serial.print(" bytes: ");
      printPayload(payload, length);
      Serial.println();
      
      // Read, execute and delete command instance formed.
      CommandReader reader = CommandReader(payload, length);
      Command* command = reader.interpretPayload();
      if (command != nullptr) {
        command->execute();
        delete command;
      }
      break;

    case WStype_BIN:
      Serial.print("[ws] binary message ");
      Serial.print(length);
      Serial.println(" bytes");
      break;

    case WStype_ERROR:
      Serial.print("[ws] error: ");
      printPayload(payload, length);
      Serial.println();
      break;

    case WStype_PING:
      Serial.println("[ws] ping");
      break;

    case WStype_PONG:
      Serial.println("[ws] pong");
      break;

    default:
      break;
  }
}

void printPayload(uint8_t *payload, size_t length) {
  for (size_t i = 0; i < length; i += 1) {
    Serial.write(payload[i]);
  }
}