#include <Arduino.h>
#include "peripherals/tank_pins.h"

#include "peripherals/pwm.h"
#include "peripherals/sensors.h"
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

#ifdef USE_TEST_CODE
  // Set motors to backwards and right (change in testing).
  setTankMotors(-1, 1);
  
#endif // USE_TEST_CODE
}

// Runs repeatedly after setup() is called.
void loop() {
#ifdef USE_TEST_CODE

  int digital_read_value = digitalRead(PIN_VCOMP1);
  // Serial.printf("Digital Read Value = %d\n", digital_read_value);
  digitalWrite(PIN_LED, digital_read_value); // HIGH or LOW.

  setTankLed(HIGH);
  setServoRotation(1); // Full forward rotation.
  
  delay(500); // Milliseconds.

  setTankLed(LOW);
  setServoRotation(-1); // Full backward rotation.

  delay(500); // ms

#endif // USE_TEST_CODE
}