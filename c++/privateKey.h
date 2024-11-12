#include <iostream>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/ec.h>

int main(){
    OpenSSL_add_all_algorithms();
    RAND_poll();

    EVP_PKEY_CTX *ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_EC, nullptr);
    EVP_PKEY_keygen_init(ctx);
    EVP_PKEY_CTX_set_ec_paramgen_curve_nid(ctx, NID_secp256k1);
    EVP_PKEY *pkey = nullptr;
    EVP_PKEY_keygen(ctx, &pkey);

    const EC_KEY *ec_key = EVP_PKEY_get0_EC_KEY(pkey);
    const BIGNUM *priv_bn = EC_KEY_get0_private_key(ec_key);

    char *priv_hex = BN_bn2hex(priv_bn);
    std::cout << "p-key: " << priv_hex << std::endl;
    
    OPENSSL_free(priv_hex);
    EVP_PKEY_free(pkey);
    EVP_PKEY_CTX_free(ctx);

    return 0;
}
