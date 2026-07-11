#include "tank_control.h"

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
    float left_multiplier = throttle;
    float right_multiplier = throttle;

    if (steering > 0) {  // Make right motor slower.
        right_multiplier *= (1 - steering);
    } else {  // Make left motor slower.
        left_multiplier *= (1 + steering);
    }

    pwmWrite(PWM_Channel::MOTOR_PWMA, (uint8_t)(100*left_multiplier));
    pwmWrite(PWM_Channel::MOTOR_PWMB, (uint8_t)(100*right_multiplier));
}