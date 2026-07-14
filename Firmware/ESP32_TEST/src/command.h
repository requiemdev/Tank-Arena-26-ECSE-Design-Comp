#ifndef COMMAND_H
#define COMMAND_H

#include <Arduino.h>

#include "tank_control.h"

class Command {
    private:
        float throttle;
        float steering;
        bool fire;
        int seq;
        int timestamp;

        Command(float throttle, float steering, bool fire, int seq, int timestamp);

    public:
        void execute();
};

Command* interpretPayload(uint8_t *payload, size_t length);

#endif // COMMAND_H
