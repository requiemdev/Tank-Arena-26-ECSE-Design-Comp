#include "sensors.h"

//volatile std::function<void(SensorDirection)> detect_hit_function;

const unsigned long DEBOUNCE_TIME_MS = 500;
volatile unsigned long button_timer = 0;
volatile bool button_pressed = false;

void onSensorHit(SensorDirection sensor_direction) {
    unsigned long current_time = millis();
    if(current_time - button_timer > DEBOUNCE_TIME_MS){
        button_pressed = true;
        button_timer = current_time;
        Serial.printf("Sensor %d detected!\n", sensor_direction);
    }
}

void IRAM_ATTR onHitFront() {
    onSensorHit(SensorDirection::FRONT);
}

void IRAM_ATTR onHitRight() {
    onSensorHit(SensorDirection::RIGHT);
}

void IRAM_ATTR onHitLeft() {
    onSensorHit(SensorDirection::LEFT);
}

void IRAM_ATTR onHitBack() {
    onSensorHit(SensorDirection::BACK);
}

void initialiseSensors(/*std::function<void(SensorDirection)> function*/) {

    // Change depending on how pins connect to sensor directions.
    attachInterrupt(digitalPinToInterrupt(PIN_VCOMP1), onHitFront, FALLING);
    attachInterrupt(digitalPinToInterrupt(PIN_VCOMP2), onHitRight, FALLING);
    attachInterrupt(digitalPinToInterrupt(PIN_VCOMP3), onHitBack, FALLING);
    attachInterrupt(digitalPinToInterrupt(PIN_VCOMP4), onHitLeft, FALLING);
}

