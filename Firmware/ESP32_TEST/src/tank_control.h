#ifndef TANK_CONTROL_H
#define TANK_CONTROL_H

#include <Arduino.h>
#include "peripherals/tank_pins.h"
#include "peripherals/pwm.h"

// Motor A or B for input in setTankMotorDirection() function.
enum TankMotor {
    MOTOR_A,
    MOTOR_B
};

// Motor directions for input in setTankMotorDirection() function.
enum MotorDirection {
    CW_DIRECTION,
    NO_DIRECTION,
    ACW_DIRECTION
};

// Change based on how motors are connected.
#define SET_LEFT_MOTOR_FORWARD setTankMotorDirection(TankMotor::MOTOR_A, MotorDirection::CW_DIRECTION)
#define SET_LEFT_MOTOR_BACKWARD setTankMotorDirection(TankMotor::MOTOR_A, MotorDirection::ACW_DIRECTION)
#define SET_RIGHT_MOTOR_FORWARD setTankMotorDirection(TankMotor::MOTOR_B, MotorDirection::ACW_DIRECTION)
#define SET_RIGHT_MOTOR_BACKWARD setTankMotorDirection(TankMotor::MOTOR_B, MotorDirection::CW_DIRECTION)

// Motor constants for controlling movement of tank.
// Top two are between 0 and 1, bottom is between 0 and 100. (although ranges can be changed if more suitable for config).
#define MOVEMENT_FACTOR 1
#define STEERING_FACTOR 1

// Working range: 40 - 100
#define TURRET_ROTATION_FACTOR 40

// Set rotation of servo. At most one condition will be true at the same time.
void setServoRotation(uint8_t acw_rotation, uint8_t cw_rotation);

// Set the IR emitter to ON or OFF depending on the value.
// Value should be LOW (0x0) or HIGH (0x1).
void setTankLed(uint8_t value);

// Set the rotation direction of the specified motor.
// Motor = MOTOR_A or MOTOR_B
// Direction = CW_DIRECTION, NO_DIRECTION or ACW_DIRECTION.
void setTankMotorDirection(TankMotor motor, MotorDirection direction);

// Set the motors based on throttle and steering values.
// Both are values between -1 and 1.
// Throttle: -1 = Full back, +1 = Full forward, 0 = Stop
// Steering: -1 = Full left, +1 = Full right, 0 = Straight
void setTankMotors(float throttle, float steering);

// Enable or disable the motors by setting STBY pin.
void setTankMotorsEnabled(uint8_t enabled);

#endif // !TANK_CONTROL_H