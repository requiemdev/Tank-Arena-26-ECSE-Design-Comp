#ifndef TANK_CONTROL_H
#define TANK_CONTROL_H

#include <Arduino.h>
#include "peripherals/tank_pins.h"

// Set the IR emitter to ON or OFF depending on the value.
// Value should be LOW (0x0) or HIGH (0x1).
void setTankLed(uint8_t value);

// Set the motors based on throttle and steering values.
// Both are values between -1 and 1.
// Throttle: -1 = Full back, +1 = Full forward, 0 = Stop
// Steering: -1 = Full left, +1 = Full right, 0 = Straight
void setTankMotors(float throttle, float steering);

#endif // !TANK_CONTROL_H