// Small key value store. On iOS and Android values go to the encrypted
// keychain / keystore through expo-secure-store. expo-secure-store has no web
// implementation, so the web preview keeps them in sessionStorage instead.
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const web = Platform.OS === 'web'

export async function getItem(key: string): Promise<string | null> {
  if (web) {
    try { return globalThis.sessionStorage?.getItem(key) ?? null } catch { return null }
  }
  try { return await SecureStore.getItemAsync(key) } catch { return null }
}

export async function setItem(key: string, value: string | null): Promise<void> {
  if (web) {
    try {
      if (value === null) globalThis.sessionStorage?.removeItem(key)
      else globalThis.sessionStorage?.setItem(key, value)
    } catch { /* private mode */ }
    return
  }
  try {
    if (value === null) await SecureStore.deleteItemAsync(key)
    else await SecureStore.setItemAsync(key, value)
  } catch { /* keychain unavailable */ }
}
