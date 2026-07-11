#ifndef PWM_H
#define PWM_H

#include <Arduino.h>

#include "code_config.h"
#include "tank_pins.h"

enum PWM_Channel {
    SERVO = 0,
    MOTOR_PWMA = 1,
    MOTOR_PWMB = 2
};

// Set up pwm pins for use in PWM output. 
// Should be used with configurePinIO() in tank_pins.h for configuring pin direction on board.
void pwmSetup();

// Set the specified PWM channel to the specified duty cycle.
// channel = value defined in PWM_Channel enum (SERVO, MOTOR_A, MOTOR_B).
// duty = value from 0 to 100 as percentage output pin is HIGH.
void pwmWrite(uint8_t channel, uint8_t duty);


#endif // !PWM_H