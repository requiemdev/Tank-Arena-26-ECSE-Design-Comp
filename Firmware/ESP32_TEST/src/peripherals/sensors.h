#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include "global_config.h"
#include "tank_pins.h"
#include "tank_timers.h"
#include "websocket.h"

enum SensorDirection {
    FRONT,
    RIGHT,
    BACK,
    LEFT
};

// The function is triggered when a sensor is hit.
void initialiseSensors(/*std::function<void(SensorDirection)> function*/);
// void onSensorHit(SensorDirection sensor_direction);
#endif // !SENSORS_H