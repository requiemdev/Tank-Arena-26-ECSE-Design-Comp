#include <Arduino.h>
#include "tank_pins.h"

// Runs once at start.
void setup() {
  Serial.begin(115200); // Baud rate

  // Set BIN1 to HIGH.
  pinMode(PIN_BIN1, OUTPUT);
  digitalWrite(PIN_BIN1, HIGH);

  // Other used pin modes.
  pinMode(PIN_LED, OUTPUT);

  // PWM Configuration
  analogWriteFrequency(333);

  // ADC Configuration
  analogSetWidth(12); // Should be default but included to be safe.
}

// Runs repeatedly after setup() is called.
void loop() {
  // PWM output
  analogWrite(PIN_SERVO, 204); // 204 = 0.80 * 255

  uint16_t analogReadValue = analogRead(A7); // A7 = ADC1_7.
  Serial.printf("ADC Analog Read Value = %d\n", analogReadValue);
  Serial.printf("Value in mV: = %d\n", analogReadMilliVolts(PIN_VCOMP1));
  
  // Write if value detected.
  if (analogReadValue > 2047) {
    digitalWrite(PIN_LED, HIGH);
  } else {
    digitalWrite(PIN_LED, LOW);
  }

  delay(500); // Milliseconds.
}
