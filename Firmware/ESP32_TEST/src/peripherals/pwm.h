#ifndef PWM_H
#define PWM_H

#include <Arduino.h>

#include "tank_pins.h"

enum PWM_Channel {
    SERVO = 0,
    MOTOR_PWMA = 2,
    MOTOR_PWMB = 3,
    SPEAKER = 4,
    // The resolution of this channel is 8 bits so use pwmWrite() only for writing into this PWM channel.
    LED = 6
};

// Set up pwm pins for use in PWM output. 
// Should be used with configurePinIO() in tank_pins.h for configuring pin direction on board.
void pwmSetup();

// Set the specified PWM channel to the specified duty cycle.
// channel = value defined in PWM_Channel enum (SERVO, MOTOR_A, MOTOR_B, SPEAKER).
// duty = value from 0 to 4095, or 0 to 255 for LED only.
void pwmWrite(uint8_t channel, uint16_t duty);

// Set the specified PWM channel to the specified duty cycle.
// channel = value defined in PWM_Channel enum (SERVO, MOTOR_A, MOTOR_B, SPEAKER). (don't input LED here)
// duty_fraction = Float between 0 and 1 (inclusive).
void pwmWriteFromFraction(uint8_t channel, float duty_fraction);

// Set the specified PWM channel to the specified duty cycle
// channel = value defined in PWM_Channel enum (SERVO, MOTOR_A, MOTOR_B, SPEAKER). (don't input LED here)
// duty_percent = Value from 0 to 100.
void pwmWriteFromPercentage(uint8_t channel, uint8_t duty_percent);


#endif // !PWM_H