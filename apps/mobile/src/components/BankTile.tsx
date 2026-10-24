import { View } from 'react-native'
import { T } from '@/ui/kit'
import { BANK } from '@/lib/bank'

const BANK_COLORS: Record<string, string> = { [BANK.name]: '#E30613', Kuda: '#40196D', OPay: '#1DCF9F', GTBank: '#E04E1B', 'Access Bank': '#F28C1A', 'First Bank': '#0B3B7A', 'Wema Bank': '#7C3AED', UBA: '#B8000F', Moniepoint: '#0357EE', 'Demo Bank': '#E30613' }

/** Square bank initial tile from the accounts screens. */
export function BankTile({ bank, size = 40 }: { bank: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: BANK_COLORS[bank] || '#3F3F46', alignItems: 'center', justifyContent: 'center' }}>
      <T color="#FFFFFF" w={800} style={{ fontSize: size * 0.42, lineHeight: size * 0.6 }}>{bank[0] || '?'}</T>
    </View>
  )
}
