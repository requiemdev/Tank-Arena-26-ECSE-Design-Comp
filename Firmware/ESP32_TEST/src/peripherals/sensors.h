#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include "global_config.h"
#include "tank_pins.h"
#include "tank_timers.h"
#include "websocket.h"

#define FRONT_PIN PIN_VCOMP1
#define RIGHT_PIN PIN_VCOMP2
#define LEFT_PIN PIN_VCOMP3
#define BACK_PIN PIN_VCOMP4

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