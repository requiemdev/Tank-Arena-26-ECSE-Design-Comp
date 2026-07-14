#ifndef WEBSOCKET_H
#define WEBSOCKET_H

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>

#include "command.h"

void websocket_loop();
void websocket_init();
void connectWiFi();
void configureWebSocket();
void handleWebSocketEvent(WStype_t type, uint8_t *payload, size_t length);
void printPayload(uint8_t *payload, size_t length);


#endif // !WEBSOCKET_H