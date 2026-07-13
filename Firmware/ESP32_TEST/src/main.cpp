#include <Arduino.h>
#include "peripherals/tank_pins.h"

#include "peripherals/pwm.h"
#include "peripherals/sensors.h"
#include "peripherals/tank_timers.h"
#include "tank_control.h"

#define USE_TEST_CODE // Enable/disable code used for testing peripherals

#define SERIAL_BAUD_RATE 115200

// Runs once at start.
void setup() {
  Serial.begin(SERIAL_BAUD_RATE);

  // Initialise pin I/O
  configurePinIO();

  // PWM Configuration
  pwmSetup();

  // Initialise Sensors
  initialiseSensors();

  // Initialise Motor Controller
  setTankMotorsEnabled(true);

  // Initialise timers.
  initialiseTimers();
}

// Runs repeatedly after setup() is called.
void loop() {
#ifdef USE_TEST_CODE

  setTankLed(HIGH);
  setServoRotation(1, 0); // ACW rotation.

  // Set motors to forwards and left (change in testing).
  setTankMotors(0.8, -0.2);
  
  delay(5000); // Milliseconds.

  setTankLed(LOW);
  setServoRotation(0, 1); // CW rotation.

  // Set motors to backwards and right (change in testing).
  setTankMotors(-0.5, 0.8);

  delay(5000); // ms

  // Set to no rotation and moving. 

  setServoRotation(0, 0);
  setTankMotors(0, 0);

  delay(5000);

#endif // USE_TEST_CODE
}