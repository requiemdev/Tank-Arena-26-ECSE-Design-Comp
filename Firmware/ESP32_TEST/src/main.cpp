#include <Arduino.h>
#include "code_config.h"
#include "tank_pins.h"

#include "pwm.h"
#include "sensors.h"

#define SERIAL_BAUD_RATE 115200

#ifdef USE_TEST_CODE

void detectSensor(SensorDirection sensor_direction) {
  Serial.printf("Sensor %d detected!\n", sensor_direction);
}

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

  // Sensor initialise
  initialiseSensors(detectSensor);
}

// Runs repeatedly after setup() is called.
void loop() {
  int digital_read_value = digitalRead(PIN_VCOMP1);
  Serial.printf("Digital Read Value = %d\n", digital_read_value);
  digitalWrite(PIN_LED, digital_read_value); // HIGH or LOW.
  
  delay(500); // Milliseconds.
}

#endif // USE_TEST_CODE

#ifndef USE_TEST_CODE

void setup() {

}

void loop() {

}

#endif // !USE_TEST_CODE