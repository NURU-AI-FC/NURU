// Bottom sheet over a scrim, as in the design's .sheet / .scrim / .grab.
import type { ReactNode } from 'react'
import { Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../lib/theme'
import { KeyAvoid, KeyboardScroll } from './KeyboardScroll'

export function Sheet({ open, onClose, children, scroll }: { open: boolean; onClose: () => void; children: ReactNode; scroll?: boolean }) {
  const { c, dark } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyAvoid style={{ justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(13,13,15,0.45)' }} />
        <View style={{ backgroundColor: dark ? c.surface : c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 24, paddingBottom: insets.bottom + 24, maxHeight: '92%' }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 }} />
          {scroll ? <KeyboardScroll contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>{children}</KeyboardScroll> : <View style={{ gap: 16 }}>{children}</View>}
        </View>
      </KeyAvoid>
    </Modal>
  )
}
