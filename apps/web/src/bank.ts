// The partner bank NURU runs inside. NURU is white-label: each bank sets these
// at build time, and the defaults keep the demo neutral.
const env = import.meta.env

export const BANK = {
  name: env.VITE_BANK_NAME || 'Partner Bank',
  // brand matches the bank's branches and ATMs on OpenStreetMap; empty shows every bank.
  brand: env.VITE_BANK_BRAND || '',
  phone: env.VITE_BANK_PHONE || '',
  staffDomain: env.VITE_BANK_STAFF_DOMAIN || '@bank.example',
}

// SUPPORT_HREF calls the bank when a phone number is set, otherwise opens support chat.
export const SUPPORT_HREF = BANK.phone ? 'tel:' + BANK.phone.replace(/\s/g, '') : '/settings/support'
