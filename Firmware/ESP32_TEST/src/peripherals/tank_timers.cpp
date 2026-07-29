#include "tank_timers.h"

hw_timer_t* speaker_timer;
hw_timer_t* command_receive_timer;

// Disable speaker
void IRAM_ATTR onSpeakerRunout() {
    pwmWrite(PWM_Channel::SPEAKER, 0);
}

void IRAM_ATTR onCommandReceiveRunout() {
    queue_disable_tank();
}

void initialiseTimers() {
    speaker_timer = timerBegin(SPEAKER_TIMER, (uint16_t)(F_CPU / 1000000UL), true);
    timerAttachInterrupt(speaker_timer, onSpeakerRunout, true);
    timerAlarmWrite(speaker_timer, SPEAKER_DURATION_US, false);

    command_receive_timer = timerBegin(COMMAND_TIMEOUT_TIMER, (uint16_t)(F_CPU / 1000000UL), true);
    timerAttachInterrupt(command_receive_timer, onCommandReceiveRunout, true);
    timerAlarmWrite(command_receive_timer, SWITCH_OFF_AFTER_COMMAND_TIMEOUT_DURATION_US, false);
}

void restartTimer(TimerNumber timer_number) {
    hw_timer_t* timer;

    switch (timer_number) {
        case SPEAKER_TIMER:
            timer = speaker_timer;
            pwmWrite(PWM_Channel::SPEAKER, 2048);
            break;
        
        case COMMAND_TIMEOUT_TIMER:
            timer = command_receive_timer;
            break;

        default:
            break;
    }

    // Stop the timer, reset it and enable again.
    timerStop(timer);
    timerWrite(timer, 0);
    timerAlarmEnable(timer);
    timerStart(timer);
}

void stopTimer(TimerNumber timer_number) {
    switch (timer_number) {
        case SPEAKER_TIMER:
            timerStop(speaker_timer);
            break;
        
        case COMMAND_TIMEOUT_TIMER:
            timerStop(command_receive_timer);
            break;

        default:
            break;
    }
}
