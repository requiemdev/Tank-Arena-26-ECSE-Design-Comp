#ifndef TANK_TIMERS_H
#define TANK_TIMERS_H

#include <Arduino.h>
#include "pwm.h"
#include "command.h"

#define SPEAKER_DURATION_US 500000UL // 0.5s
#define SWITCH_OFF_AFTER_COMMAND_TIMEOUT_DURATION_US 980000UL // 0.98s, ensure off-sync from command sends.

enum TimerNumber {
    SPEAKER_TIMER,
    COMMAND_TIMEOUT_TIMER
};

// Initialise timers used in MCU code.
// These include:
// - Speaker buzz duration.
// - Command timeout.
void initialiseTimers();

// Start the timer with the specified number. If the timer is already going, it will reset before starting again.
void restartTimer(TimerNumber timer_number);

// Stop timer with specified number.
void stopTimer(TimerNumber timer_number);

#endif // !TANK_TIMERS_H