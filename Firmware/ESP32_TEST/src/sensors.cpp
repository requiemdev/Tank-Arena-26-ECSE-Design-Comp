#include "sensors.h"

std::function<void(SensorDirection)> detect_hit_function;

void onHitFront() {
    detect_hit_function(SensorDirection::FRONT);
}

void onHitRight() {
    detect_hit_function(SensorDirection::RIGHT);
}

void onHitLeft() {
    detect_hit_function(SensorDirection::LEFT);
}

void onHitBack() {
    detect_hit_function(SensorDirection::BACK);
}

void initialiseSensors(std::function<void(SensorDirection)> function) {

    detect_hit_function = function;

    // Change depending on how pins connect to sensor directions.
    attachInterrupt(digitalPinToInterrupt(PIN_VCOMP1), onHitFront, RISING);
    attachInterrupt(digitalPinToInterrupt(PIN_VCOMP2), onHitRight, RISING);
    attachInterrupt(digitalPinToInterrupt(PIN_VCOMP3), onHitBack, RISING);
    attachInterrupt(digitalPinToInterrupt(PIN_VCOMP4), onHitLeft, RISING);
}

