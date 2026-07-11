#ifndef TANK_CONTROL_H
#define TANK_CONTROL_H

#include <Arduino.h>
#include "peripherals/tank_pins.h"

// Set the IR emitter to ON or OFF depending on the value.
// Value should be LOW (0x0) or HIGH (0x1).
void setTankLed(uint8_t value);

#endif // !TANK_CONTROL_H