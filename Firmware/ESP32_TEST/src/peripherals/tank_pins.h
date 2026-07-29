#ifndef TANK_PINS_H
#define TANK_PINS_H

#include <Arduino.h>
#include "pins_arduino.h"

// Motor Pins
#define PIN_AIN1 3
#define PIN_AIN2 19
#define PIN_PWMA 18
#define PIN_BIN1 26
#define PIN_BIN2 27
#define PIN_PWMB 23
#define PIN_STBY 23

// Screen Pins
#define PIN_SDA 21
#define PIN_SCL 22

// Sensor Pins
#define PIN_VCOMP1 35
#define PIN_VCOMP2 34
#define PIN_VCOMP3 39
#define PIN_VCOMP4 36

// Misc Pins
#define PIN_SERVO 25
#define PIN_SPKR 33
#define PIN_LED 32

// Configure the MCU pins to be input or output as needed.
void configurePinIO();

#endif // !TANK_PINS_H