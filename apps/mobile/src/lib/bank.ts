import { Linking } from 'react-native'
import { router } from 'expo-router'

// The partner bank NURU runs inside. NURU is white-label: each bank sets these
// at build time, and the defaults keep the demo neutral.
const partner = process.env.EXPO_PUBLIC_BANK_NAME || ''

export const BANK = {
  name: partner || 'Partner Bank',
  // partner is set only when a real bank is named, for the "in partnership with" line.
  partner,
  phone: process.env.EXPO_PUBLIC_BANK_PHONE || '',
}

// callSupport rings the bank when a phone number is set, otherwise asks NURU for a person.
export function callSupport() {
  if (BANK.phone) Linking.openURL('tel:' + BANK.phone.replace(/\s/g, ''))
  else router.push({ pathname: '/ask', params: { q: 'I need help from customer service' } })
}
