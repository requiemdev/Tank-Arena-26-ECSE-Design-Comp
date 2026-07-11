#include "tank_control.h"

// At factor = -1, duty should be 1/6. At factor = 1, duty should be 5/6.

void setServoRotation(float factor) {
    uint16_t duty = factor * 13 * TURRET_ROTATION_FACTOR + 2048;
    pwmWrite(PWM_Channel::SERVO, duty);
}

void setTankLed(uint8_t value) {
    digitalWrite(PIN_LED, value);
}

// CW: IN1 = HIGH, IN2 = LOW
// ACW: IN1 = LOW, IN2 = HIGH
// NO_DIR: Both same (use low to use more stable GND).

void setTankMotorDirection(TankMotor motor, MotorDirection direction) {
    uint8_t IN1_PIN, IN2_PIN;
    
    // Set the pins to configure based on motor.
    if (motor == TankMotor::MOTOR_A) {
        IN1_PIN = PIN_AIN1;
        IN2_PIN = PIN_AIN2;
    } else if (motor == TankMotor::MOTOR_B) {
        IN1_PIN = PIN_BIN1;
        IN1_PIN = PIN_BIN2;
    } else {
        Serial.printf("Invalid motor %d configured!", motor);
        return;  // Invalid motor used.
    }

    // Set pin values based on direction.
    if (direction == MotorDirection::CW_DIRECTION) {
        digitalWrite(IN1_PIN, HIGH);
    } else {
        digitalWrite(IN1_PIN, LOW);
    }
    if (direction == MotorDirection::ACW_DIRECTION) {
        digitalWrite(IN2_PIN, HIGH);
    } else {
        digitalWrite(IN2_PIN, LOW);
    }
}

/**
Forward directions: LEFT motor = ACW, RIGHT motor = CW.
FORWARD + RIGHT -> Left full, Right slow
FORWARD + LEFT -> Left slow, Right full
BACKWARD + RIGHT -> Left full, Right slow
BACKWARD + LEFT -> Left slow, Right full
*/

void setTankMotors(float throttle, float steering) {
    // Set motor directions based completely on sign of throttle
    if (throttle > 0) { // Move forward.
        SET_LEFT_MOTOR_FORWARD;
        SET_RIGHT_MOTOR_FORWARD;
    
    } else if (throttle < 0) { // Move backward.
        SET_LEFT_MOTOR_BACKWARD;
        SET_RIGHT_MOTOR_BACKWARD;
    
    } else { // Stop motors.
        setTankMotorDirection(TankMotor::MOTOR_A, MotorDirection::NO_DIRECTION);
        setTankMotorDirection(TankMotor::MOTOR_B, MotorDirection::NO_DIRECTION);
    }

    // Set motor strengths based on throttle and one motor slower by steering factor.
    float left_multiplier = throttle * MOVEMENT_FACTOR;
    float right_multiplier = throttle * MOVEMENT_FACTOR;

    if (steering > 0) {  // Make right motor slower.
        right_multiplier *= (1 - steering) * STEERING_FACTOR;
    } else {  // Make left motor slower.
        left_multiplier *= (1 + steering) * STEERING_FACTOR;
    }

    pwmWriteFromFraction(PWM_Channel::MOTOR_PWMA, left_multiplier);
    pwmWriteFromFraction(PWM_Channel::MOTOR_PWMB, right_multiplier);
}

void setTankMotorsEnabled(uint8_t enabled) {
    if (enabled) {
        digitalWrite(PIN_STBY, HIGH);
    } else {
        digitalWrite(PIN_STBY, LOW);
    }
}