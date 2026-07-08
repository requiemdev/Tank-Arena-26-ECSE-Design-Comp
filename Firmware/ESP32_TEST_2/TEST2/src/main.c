#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/ledc.h"
#include "driver/gpio.h"

#include "esp_adc/adc_oneshot.h"
#include "esp_log.h"

#include "tank_pins.h"

#define PIN_VCOMP1_ADC_CHANNEL 7

void app_main() {
    printf("Testing print statements.");

    // Digital pin config
    gpio_reset_pin(PIN_BIN1);
    gpio_set_direction(PIN_BIN1, GPIO_MODE_OUTPUT);

    gpio_reset_pin(PIN_LED);
    gpio_set_direction(PIN_LED, GPIO_MODE_OUTPUT);

    gpio_set_level(PIN_BIN1, 1);

    // Configure LEDC timer (PWM)
    ledc_timer_config_t ledc_timer = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .duty_resolution = LEDC_TIMER_10_BIT,
        .timer_num = LEDC_TIMER_0,
        .freq_hz = 333
    };
    ledc_timer_config(&ledc_timer);

    // Configure LEDC channel (PWM)
    ledc_channel_config_t ledc_channel = {
        .gpio_num = PIN_SERVO,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel = LEDC_CHANNEL_0,
        .timer_sel = LEDC_TIMER_0,
        .duty = 819
    };
    ledc_channel_config(&ledc_channel);

    //ESP_ERROR_CHECK(esp_error_t);

    //ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, 819); // I think this is for updating duty cycle.
    //ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);

    adc_oneshot_unit_handle_t adc_handle;

    adc_oneshot_unit_init_cfg_t init_config = {
        .unit_id = ADC_UNIT_1,
    };

    adc_oneshot_new_unit(&init_config, &adc_handle);

    adc_oneshot_chan_cfg_t config = {
        .bitwidth = 12,
        .atten = ADC_ATTEN_DB_0,
    };

    adc_oneshot_config_channel(adc_handle, PIN_VCOMP1_ADC_CHANNEL, &config);

    while (1) {
        
        int adcResult = 0;
        adc_oneshot_read(adc_handle, PIN_VCOMP1_ADC_CHANNEL, &adcResult);

        if (adcResult > 2047) {
            gpio_set_level(PIN_LED, 1);
        } else {
            gpio_set_level(PIN_LED, 0);
        }

        printf("ADC Result = %d\n", adcResult);


        vTaskDelay(pdMS_TO_TICKS(500));
    }
}