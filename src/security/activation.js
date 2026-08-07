import * as Crypto from 'expo-crypto';

const ACTIVATION_CONTEXT = 'ABC|activation|v1|';
const ACTIVATION_DIGEST = 'fcddcfe5448a9e4c971eb027c0bdb57c7ce587b5c222d7540fd7d735a0a0c968';

export async function isActivationCodeValid(code) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return false;

  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${ACTIVATION_CONTEXT}${normalizedCode}`
  );
  return digest === ACTIVATION_DIGEST;
}
