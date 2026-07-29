#include "tank_pins.h"

void configurePinIO() {
    // Motor pins
    pinMode(PIN_AIN1, OUTPUT);
    pinMode(PIN_AIN2, OUTPUT);
    pinMode(PIN_PWMA, OUTPUT);
    pinMode(PIN_BIN1, OUTPUT);
    pinMode(PIN_BIN2, OUTPUT);
    pinMode(PIN_PWMB, OUTPUT);
    pinMode(PIN_STBY, OUTPUT);

    // Screen pins
    pinMode(PIN_SDA, OUTPUT);
    pinMode(PIN_SCL, OUTPUT);

    // Sensor pins
    pinMode(PIN_VCOMP1, INPUT);
    pinMode(PIN_VCOMP2, INPUT);
    pinMode(PIN_VCOMP3, INPUT);
    pinMode(PIN_VCOMP4, INPUT);

    // Misc pins
    pinMode(PIN_SERVO, OUTPUT);
    pinMode(PIN_SPKR, OUTPUT);
    pinMode(PIN_LED, OUTPUT);
}