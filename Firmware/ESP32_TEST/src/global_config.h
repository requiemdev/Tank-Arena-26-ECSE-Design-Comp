#ifndef GLOBAL_CONFIG_H
#define GLOBAL_CONFIG_H

//#define USE_TEST_CODE // Define to use test code instead of server connection code.
//#define PRINT_HIT_DIRECTIONS  // Define to print directions of hits as soon as they are detected.
//#define PRINT_COMMAND_INTERPRET_INFORMATION // Define to print values of fields sent by the server.

#define PLAYER_SLOT "p1" // Use "p1" or "p2".

// Set the sensor number that was hit so a message can be sent to the server.
void set_hit_detect_sensor(int8_t hit_detect_sensor);

// Disable all tank peripherals when timer runs out.
void queue_disable_tank();

#endif // !GLOBAL_CONFIG_H