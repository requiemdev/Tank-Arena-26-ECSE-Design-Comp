#include "pwm.h"

// Need PWM for motor PWM pins + Servo pin.
// Set them up on different channels to independently control them.

void pwmSetup() {

    ledcSetup(PWM_Channel::SERVO, 333, 12);
    ledcSetup(PWM_Channel::MOTOR_PWMA, 333, 12);
    ledcSetup(PWM_Channel::MOTOR_PWMB, 333, 12);
    ledcSetup(PWM_Channel::SPEAKER, 333, 12);

    ledcAttachPin(PIN_SERVO, PWM_Channel::SERVO);
    ledcAttachPin(PIN_PWMA, PWM_Channel::MOTOR_PWMA);
    ledcAttachPin(PIN_PWMB, PWM_Channel::MOTOR_PWMB);
    ledcAttachPin(PIN_SPKR, PWM_Channel::SPEAKER);
}

void pwmWrite(uint8_t channel, uint16_t duty) {
    ledcWrite(channel, duty);
}

void pwmWriteFromFraction(uint8_t channel, float duty_fraction) {
    ledcWrite(channel, (uint16_t)(4095 * duty_fraction));
}

void pwmWriteFromPercentage(uint8_t channel, uint8_t duty_percent) {
    ledcWrite(channel, (uint16_t)duty_percent * 4095 / 100);
}
