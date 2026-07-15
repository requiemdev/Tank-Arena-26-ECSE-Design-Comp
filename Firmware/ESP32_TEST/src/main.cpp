#include <Arduino.h>
#include "peripherals/tank_pins.h"

#include "peripherals/pwm.h"
#include "peripherals/sensors.h"
#include "peripherals/tank_timers.h"
#include "peripherals/websocket.h"
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

#ifndef USE_TEST_CODE
  // Initialise websockets
  websocket_init();
#endif // !USE_TEST_CODE
}

// Runs repeatedly after setup() is called.
void loop() {
// NOTE: DO NOT USE DELAY WHEN TESTING WEBSOCKETS

#ifdef USE_TEST_CODE

  setTankLed(HIGH);
  setServoRotation(1, 0); // ACW rotation.

  // Set motors to forwards and left (change in testing).
  setTankMotors(1, -0.2);
  
  delay(3000); // Milliseconds.

  //setTankLed(LOW);
  setServoRotation(0, 1); // CW rotation.

  // Set motors to backwards and right (change in testing).
  // NOTE: works at product = 0.18
  setTankMotors(-0.45, 0.6);

  delay(3000); // ms

  // Set to no rotation and moving. 

  setServoRotation(0, 0);
  setTankMotors(0, 0);

  delay(3000);

  //setTankLed(HIGH);
  setServoRotation(1, 0); // Full forward rotation.
  
  delay(500); // Milliseconds.

  //setTankLed(LOW);
  setServoRotation(0, 1); // Full backward rotation.

  delay(500); // ms

#endif // USE_TEST_CODE

#ifndef USE_TEST_CODE
  websocket_loop();
#endif //!USE_TEST_CODE
}
