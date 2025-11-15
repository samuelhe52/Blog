---
title: "Security & Cryptography"
description: "MIT Missing Semester Notes on Security & Cryptography"
date: 2025-08-21
lang: "en"
translationSlug: "missing-semester-notes/security-and-cryptography"
author: "konakona"
---

## Hash Functions

- sha1(bytes) -> 160 bits
- sha256(bytes) -> 256 bits
- md5(bytes) -> 128 bits

Properties:

- non-reversible
- collision resistant

 Usage:

```shell
sha1sum <file>
echo -n "<string>" | sha1sum
# `-n`: no newline at the end of string
```

`sha1sum` can be replaced with `sha256sum` or `md5sum` for alternative hash functions.

## Symmetric Key Cryptography

- `keygen() -> key`
- `encrypt(plaintext, key) -> ciphertext`
- `decrypt(ciphertext, key) -> plaintext`
- a "salt" is a random value added to a password or other data before hashing or encrypting it, making the hashed content non-deterministic. This means that two hashing attempts on the same password wouldn't have the same results, making [rainbow tables](https://en.wikipedia.org/wiki/Rainbow_table) useless.

Usage:

```shell
openssl aes-256-cbc -salt -in {input filename} -out {output filename}
openssl aes-256-cbc -d -in {input filename} -out {output filename}
```

In this case, the salt is stored inside the encrypted file.

By default, `openssl` uses `pbkdf1`, which is considered deprecated. Append `-iter` or `-pbkdf2` when encrypting or decrypting.

### Key Derivation Function (KDF)

Takes a simple passphrase and converts it to a complex cryptographic key.

## Asymmetric Key Cryptography

- `keygen() -> (pubkey privkey)`
- `encrypt(plaintext, pubkey) -> ciphertext`
- `decrypt(ciphertext, privkey) -> plaintext`

Usage Example: Your friend tries to send an important piece of information to you over the internet. For security reason he decides to encrypt this piece of information, but with symmetric encryption, both of you must have the same passphrase (or key) to encrypt/decrypt the content. This means sending passphrase over the internet, which is insecure. With asymmetric key cryptography, it is possible to send the public key to your friend and let him encrypt his content with that public key for you to decrypt using your corresponding private key, which stays on your computer securely. This is the foundation of modern secure internet connections.

The problem with this kind of encryption method is that the public key that is sent over the internet could be forged by man-in-the-middle attackers: they replace your public key with their own and sends it to your friend.

## Hybrid Encryption

Symmetric encryption is fast while asymmetric encryption is slow, making **hybrid encryption** a solution ideal for performance considerations.

Workflow:

1. Encrypt the **symmetric key** using **asymmetric** encryption
2. Send the **encrypted symmetric key** over the internet in plaintext
3. After that, use the **symmetric key** for communication

### Signing and Verification

- `sign(message, privkey) -> signature`
- `verify(message, signature, pubkey) -> bool`

Used by git and all other network service providers to verify their products' validity.
