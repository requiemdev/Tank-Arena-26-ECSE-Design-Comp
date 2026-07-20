#include "sensors.h"

//volatile std::function<void(SensorDirection)> detect_hit_function;

const unsigned long DEBOUNCE_TIME_MS = 500;
volatile unsigned long button_timer = 0;
volatile bool button_pressed = false;

void onSensorHit(SensorDirection sensor_direction) {
    unsigned long current_time = millis();

    #ifdef PRINT_HIT_DIRECTIONS
    switch (sensor_direction) {
        case FRONT:
            Serial.printf("Hit detected: front\n");
            break;

        case LEFT:
            Serial.printf("Hit detected: left\n");
            break;

        case RIGHT:
            Serial.printf("Hit detected: right\n");
            break;

        case BACK:
            Serial.printf("Hit detected: back\n");
            break;
        
        default:
            break;
    }
    #endif // PRINT_HIT_DIRECTIONS

    if(current_time - button_timer > DEBOUNCE_TIME_MS){
        button_pressed = true;
        button_timer = current_time;
        restartTimer(TimerNumber::SPEAKER_TIMER);

        // Queue for hit detection.
        set_hit_detect_sensor(sensor_direction);
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
    attachInterrupt(digitalPinToInterrupt(PIN_VCOMP3), onHitLeft, FALLING);
    attachInterrupt(digitalPinToInterrupt(PIN_VCOMP4), onHitBack, FALLING);
}

