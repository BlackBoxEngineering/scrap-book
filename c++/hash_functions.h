#ifndef HASHFUNCTIONS_H
#define HASHFUNCTIONS_H

#include <string>
using namespace std;

// This class implements various hash functions
class hash_functions {
protected:
    // Type aliases for register sizes
    using register_8 = unsigned char;
    using register_32 = unsigned int;
    using register_64 = unsigned long long;

    // Predefined hash keys for the hash functions
    static const register_32 hash_keys[];
    // Block size definition for 256-bit blocks
    static const unsigned int BLOCK_SIZE_of_256 = (512 / 8);

public:
    // Initialize the state register
    void stateregister();
    // Adjusts the digest based on the input text
    void adjust_digest(const unsigned char *text, unsigned int text_len);
    // Finalize the digest computation
    void digest_final(unsigned char *digest);
    // Padding size definition for 256-bit padding
    static const unsigned int PADD_SIZE = (256 / 8);

protected:
    // Compresses the message into a fixed-size block
    void compress(const unsigned char *message, unsigned int block_nb);
    unsigned int s_r_totlen;  // Total length of the processed data
    unsigned int s_r_len;  // Length of the current block
    unsigned char s_r_block[2 * BLOCK_SIZE_of_256];  // Buffer for current block
    register_32 s_r[8];  // State register
};

// Computes the SHA-256 hash for the input string
string sha256(string input);

// Macro definitions for bitwise operations
#define R_SHFT(x, n) (x >> n) // Right shift function
#define R_ROTATE(x, n) ((x >> n) | (x << ((sizeof(x) << 3) - n))) // Right rotate function
#define L_ROTATE(x, n) ((x << n) | (x >> ((sizeof(x) << 3) - n)))  // Left rotate function
#define CHOICE_OF(x, y, z) ((x & y) ^ (~x & z)) // Choice function used in SHA-256
#define MAJORITY_OF(x, y, z) ((x & y) ^ (x & z) ^ (y & z)) // Majority function used in SHA-256
#define SHAF_1(x)                       \
    (R_ROTATE(x, 2) ^ R_ROTATE(x, 13) ^ \
     R_ROTATE(x, 22)) // Sigma function 1 for SHA-256
#define SHAF_2(x)                       \
    (R_ROTATE(x, 6) ^ R_ROTATE(x, 11) ^ \
     R_ROTATE(x, 25)) // Sigma function 2 for SHA-256
#define SHAF_3(x) \
    (R_ROTATE(x, 7) ^ R_ROTATE(x, 18) ^ R_SHFT(x, 3)) // Sigma0 function for SHA-256
#define SHAF_4(x) \
    (R_ROTATE(x, 17) ^ R_ROTATE(x, 19) ^ R_SHFT(x, 10)) // Sigma1 function for SHA-256
#define SHAF_UNPACK32(x, str)                   \
    {                                           \
        *((str) + 3) = (register_8)((x));       \
        *((str) + 2) = (register_8)((x) >> 8);  \
        *((str) + 1) = (register_8)((x) >> 16); \
        *((str) + 0) = (register_8)((x) >> 24); \
    } // Unpacks a 32-bit value into a byte array
#define SHAF_PACK32(str, x)                          \
    {                                                \
        *(x) = ((register_32) * ((str) + 3)) |       \
               ((register_32) * ((str) + 2) << 8) |  \
               ((register_32) * ((str) + 1) << 16) | \
               ((register_32) * ((str) + 0) << 24);  \
    } // Packs a byte array into a 32-bit value

#endif