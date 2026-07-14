#include "command.h"

Command::Command(float throttle, float steering, bool fire, int seq, int timestamp) {
    this->throttle = throttle;
    this->steering = steering;
    this->fire = fire;
    this->seq = seq;
    this->timestamp = timestamp;
}

void Command::execute() {
    setTankMotors(this->throttle, this->steering);
    setTankLed(this->fire);
}

Command* interpretPayload(uint8_t *payload, size_t length) {

}
