#include "pwm.h"

// Need PWM for motor PWM pins + Servo pin.
// Set them up on different channels to independently control them.

void pwmSetup() {
    //analogWriteFrequency(333);
    ledcSetup(PWM_Channel::SERVO, 333, 12);
    ledcSetup(PWM_Channel::MOTOR_PWMA, 1000, 12);
    ledcSetup(PWM_Channel::MOTOR_PWMB, 1000, 12);

    ledcAttachPin(PIN_SERVO, PWM_Channel::SERVO);
    ledcAttachPin(PIN_PWMA, PWM_Channel::MOTOR_PWMA);
    ledcAttachPin(PIN_PWMB, PWM_Channel::MOTOR_PWMB);
}

void pwmWrite(uint8_t channel, uint8_t duty) {
    ledcWrite(channel, (4095 * duty) / 100);
}

