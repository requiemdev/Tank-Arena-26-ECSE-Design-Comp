#ifndef COMMAND_H
#define COMMAND_H

#include <Arduino.h>

#include "tank_control.h"

//#define PRINT_COMMAND_INTERPRET_INFORMATION

// Represents a command sent from the servo which should be executed by the tank.
class Command {
    private:
        float throttle;
        float steering;
        bool fire;
        bool left;
        bool right;
        int seq;
        int timestamp;

    public:
        Command(float throttle, float steering, bool fire, bool left, bool right, int seq, int timestamp);

        // Executes command, giving the appropriate function calls to control the MCU peripherals.
        void execute();
};

class CommandReader {
    private:
        uint8_t *payload;
        size_t length;
        int index;
        bool read_success;

        bool readBool();
        float readFloat();
        int readInt();
        String* readString();
        
        // Reads a JSON key in the payload and returns the key as a string
        String* readKey();

    public:
        CommandReader(uint8_t *payload, size_t length);

        // Reads the payload string which is in JSON form, outputting the resulting command.
        // Returns nullptr if the payload is invalid.
        Command* interpretPayload();
};

#endif // COMMAND_H
