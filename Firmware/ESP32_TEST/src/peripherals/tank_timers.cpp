#include "tank_timers.h"

hw_timer_t* speaker_timer;

// Disable speaker
void IRAM_ATTR onSpeakerRunout() {
    pwmWrite(PWM_Channel::SPEAKER, 0);
}

void initialiseTimers() {
    speaker_timer = timerBegin(SPEAKER_TIMER, (uint16_t)(F_CPU / 1000000UL), true);
    timerAttachInterrupt(speaker_timer, onSpeakerRunout, true);
    timerAlarmWrite(speaker_timer, 1000 * SPEAKER_DURATION_MS, false);
}

void startTimer(TimerNumber timer_number) {
    // Stop the timer, reset it and enable again.
    timerStop(speaker_timer);
    timerWrite(speaker_timer, 0);
    timerAlarmEnable(speaker_timer);
    timerStart(speaker_timer);

    switch (timer_number) {
        case SPEAKER_TIMER:
            pwmWrite(PWM_Channel::SPEAKER, 2048);
            break;
        
        default:
            break;
    }
}