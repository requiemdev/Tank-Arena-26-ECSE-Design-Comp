#ifndef TANK_TIMERS_H
#define TANK_TIMERS_H

#include <Arduino.h>
#include "pwm.h"

#define SPEAKER_DURATION_MS 500

enum TimerNumber {
    SPEAKER_TIMER
};

// Initialise timers used in MCU code.
// These include:
// - Speaker buzz duration.
void initialiseTimers();

// Start the timer with the specified number. If the timer is already going, it will reset before starting again.
void startTimer(TimerNumber timer_number);

#endif // !TANK_TIMERS_H