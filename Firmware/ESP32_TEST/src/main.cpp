#include <Arduino.h>
#include "code_config.h"
#include "peripherals/tank_pins.h"

#include "peripherals/pwm.h"
#include "peripherals/sensors.h"
#include "tank_control.h"

#define SERIAL_BAUD_RATE 115200

void onSensorHit(SensorDirection sensor_direction) {
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

  // Initialise Sensors
  initialiseSensors(onSensorHit);

#ifdef USE_TEST_CODE
  
  // PWM output
  pwmWrite(PWM_Channel::SERVO, 75);
  
#endif // USE_TEST_CODE
}

// Runs repeatedly after setup() is called.
void loop() {
#ifdef USE_TEST_CODE

  int digital_read_value = digitalRead(PIN_VCOMP1);
  Serial.printf("Digital Read Value = %d\n", digital_read_value);
  digitalWrite(PIN_LED, digital_read_value); // HIGH or LOW.

  setTankLed(HIGH);
  
  delay(500); // Milliseconds.

  setTankLed(LOW);

  delay(500); // ms

#endif // USE_TEST_CODE
}


#ifndef USE_TEST_CODE

void setup() {

}

void loop() {

}

#endif // !USE_TEST_CODE