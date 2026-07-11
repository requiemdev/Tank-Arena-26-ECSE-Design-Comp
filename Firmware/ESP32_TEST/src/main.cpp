#include <Arduino.h>
#include "code_config.h"
#include "tank_pins.h"

#define SERIAL_BAUD_RATE 115200

#ifdef USE_TEST_CODE

// Runs once at start.
void setup() {
  Serial.begin(SERIAL_BAUD_RATE);

  // Set BIN1 to HIGH.
  pinMode(PIN_BIN1, OUTPUT);
  digitalWrite(PIN_BIN1, HIGH);

  // Other used pin modes.
  pinMode(PIN_LED, OUTPUT);

  // PWM Configuration
  analogWriteFrequency(333);

  // PWM output
  analogWrite(PIN_SERVO, 204); // 204 = 0.80 * 255
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