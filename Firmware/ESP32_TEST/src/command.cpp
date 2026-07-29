#include "command.h"

Command::Command(float throttle, float steering, bool fire, bool left, bool right, int seq, int timestamp) {
    this->throttle = throttle;
    this->steering = steering;
    this->fire = fire;
    this->left = left;
    this->right = right;
    this->seq = seq;
    this->timestamp = timestamp;
}

// Ignores seq and timestamp for now.

void Command::execute() {
    setTankMotors(this->throttle, this->steering);
    setTankLed(this->fire);
    setServoRotation(this->left, this->right);
}

CommandReader::CommandReader(uint8_t *payload, size_t length) {
    this->payload = payload;
    this->length = length;
    this->index = 1;  // Start after initial '{'
    this->read_success = true;
}

// This is a sequence of chars to interpret.
// Contents should look like {"throttle":float,"steering":float,"fire":bool,"seq":int,"ts":int}
// A JSON string was sent so contents may be unordered but there are no duplicates.

Command* CommandReader::interpretPayload() {
    // Fields to set.
    float throttle = 0;
    float steering = 0;
    bool fire = false;
    bool left = false;
    bool right = false;
    int seq = 0;
    int timestamp = 0;
    
    int fields_set = 0;
    
    while (index < length && payload[index] != '\0') {
        String* key = readKey();
        if (!read_success) {
            if (key != nullptr) {
                delete key;
            }
            return nullptr;
        }

        if (key->equals("throttle")) {
            throttle = readFloat();
            
            #ifdef PRINT_COMMAND_INTERPRET_INFORMATION
            Serial.printf("throttle: %f\n", throttle);
            #endif // PRINT_COMMAND_INTERPRET_INFORMATION
        
        } else if (key->equals("steering")) {
            steering = readFloat();
            
            #ifdef PRINT_COMMAND_INTERPRET_INFORMATION
            Serial.printf("steering: %f\n", steering);
            #endif // PRINT_COMMAND_INTERPRET_INFORMATION
        
        } else if (key->equals("fire")) {
            fire = readBool();

            #ifdef PRINT_COMMAND_INTERPRET_INFORMATION
            Serial.printf("fire: %d\n", fire);
            #endif // PRINT_COMMAND_INTERPRET_INFORMATION

        } else if (key->equals("left")) {
            left = readBool();

            #ifdef PRINT_COMMAND_INTERPRET_INFORMATION
            Serial.printf("left: %d\n", left);
            #endif // PRINT_COMMAND_INTERPRET_INFORMATION

        } else if (key->equals("right")) {
            right = readBool();

            #ifdef PRINT_COMMAND_INTERPRET_INFORMATION
            Serial.printf("right: %d\n", right);
            #endif // PRINT_COMMAND_INTERPRET_INFORMATION
        
        } else if (key->equals("seq")) {
            seq = readInt();

            #ifdef PRINT_COMMAND_INTERPRET_INFORMATION
            Serial.printf("seq: %d\n", seq);
            #endif // PRINT_COMMAND_INTERPRET_INFORMATION
        
        } else if (key->equals("ts")) {
            timestamp = readInt();

            #ifdef PRINT_COMMAND_INTERPRET_INFORMATION
            Serial.printf("ts: %d\n", timestamp);
            #endif // PRINT_COMMAND_INTERPRET_INFORMATION
        
        } else {
            // Invalid field!
            #ifdef PRINT_COMMAND_INTERPRET_INFORMATION
            Serial.printf("Invalid field: %s, exiting!\n", key->c_str());
            #endif // PRINT_COMMAND_INTERPRET_INFORMATION
            
            if (key != nullptr) {
                delete key;
            }
            return nullptr;
        }
        fields_set += 1;
        if (key != nullptr) {
            delete key;
        }
    }

    if (fields_set == 7 && read_success) {
        return new Command(throttle, steering, fire, left, right, seq, timestamp);
    } else {
        // Not enough fields
        #ifdef PRINT_COMMAND_INTERPRET_INFORMATION
        Serial.printf("Not enough fields set: %d, exiting!\n", fields_set);
        #endif // PRINT_COMMAND_INTERPRET_INFORMATION
        
        return nullptr;
    }
}

bool CommandReader::readBool() {
    if (index + 3 < length && payload[index] == 't' && payload[index + 1] == 'r' && payload[index + 2] == 'u' && payload[index + 3] == 'e') {
        index += 5; // Skip separator at index + 4
        return true;
    } else if (index + 4 < length && payload[index] == 'f' && payload[index + 1] == 'a' && 
        payload[index + 2] == 'l' && payload[index + 3] == 's' && payload[index + 4] == 'e') 
    {
        index += 6; // Skip separator at index + 5
        return false;    
    }
    read_success = false;
    return false;
}

float CommandReader::readFloat() {
    // Check if result should be a negative.
    bool negative_result = false;
    if (index < length && payload[index] == '-') {
        negative_result = true;
        index += 1;
    }
    
    // Read integer part.
    float result = (float)readInt();
    if (read_success && payload[index - 1] == '.') { // Check separator which was skipped during readInt().
        // Add decimal part.
        float fractional_multiplier = 0.1f;
        while (index < length && '0' <= payload[index] && payload[index] <= '9') {
            result += (payload[index] - '0') * fractional_multiplier;
            fractional_multiplier *= 0.1f;
            index += 1;
        }
        if (index >= length) {
            read_success = false;
        }
        index += 1;  // Skip separator
    }
    // Check and return negative of result if start is -'ve.
    if (negative_result) {
        return -result;
    }
    return result;
}

int CommandReader::readInt() {
    // Check if result should be a negative.
    bool negative_result = false;
    if (index < length && payload[index] == '-') {
        negative_result = true;
        index += 1;
    }

    int result = 0;
    while (index < length && '0' <= payload[index] && payload[index] <= '9') {
        result = result * 10 + payload[index] - '0';
        index += 1;
    }
    if (index >= length) {
        read_success = false;
    }
    index += 1; // Skip separator
    
    // Check and return negative of result if start is -'ve.
    if (negative_result) {
        return -result;
    }
    return result;
}


String* CommandReader::readString() {
    // Check valid start of string.
    if (payload[index] == '"') {
        index += 1;
    } else {
        read_success = false;
        return nullptr;
    }
    
    String* str = new String();
    while (index < length && payload[index] != '"') {
        *str += (char)payload[index];
        index += 1;
    }
    if (index >= length) { // String not closed.
        read_success = false;
    }
    index += 2; // Go to next entry (don't need to check for presence of ,/: separator).
    return str;
}

String* CommandReader::readKey() {
    return this->readString();
}
