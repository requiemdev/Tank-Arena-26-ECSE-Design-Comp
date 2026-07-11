#include <Arduino.h>
#include "code_config.h"
#include "tank_pins.h"

#include "pwm.h"

#define SERIAL_BAUD_RATE 115200

#ifdef USE_TEST_CODE

// Runs once at start.
void setup() {
  Serial.begin(SERIAL_BAUD_RATE);

  // Initialise pin I/O
  configurePinIO();

  // Set BIN1 to HIGH.
  digitalWrite(PIN_BIN1, HIGH);

  // PWM Configuration
  pwmSetup();

  // PWM output
  pwmWrite(PWM_Channel::SERVO, 75);
}

// Runs repeatedly after setup() is called.
void loop() {
  int digitalReadValue = digitalRead(PIN_VCOMP1);
  Serial.printf("Digital Read Value = %d\n", digitalReadValue);
  digitalWrite(PIN_LED, digitalReadValue); // HIGH or LOW.

  delay(500); // Milliseconds.
}

#endif // USE_TEST_CODE

#ifndef USE_TEST_CODE

void setup() {

}

void loop() {

}

#endif // !USE_TEST_CODE