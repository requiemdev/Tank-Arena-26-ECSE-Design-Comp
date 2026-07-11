#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include "tank_pins.h"

enum SensorDirection {
    FRONT,
    RIGHT,
    BACK,
    LEFT
};

// The function is triggered when a sensor is hit.
void initialiseSensors(std::function<void(SensorDirection)> function);

#endif // !SENSORS_H