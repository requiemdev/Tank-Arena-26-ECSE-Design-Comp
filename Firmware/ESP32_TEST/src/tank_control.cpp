#include "tank_control.h"

void setTankLed(uint8_t value) {
    digitalWrite(PIN_LED, value);
}