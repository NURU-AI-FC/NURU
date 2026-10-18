// Unread notification count shared by any component that shows a badge.
import { useEffect, useState } from 'react'
import { api, token } from './api'

export type Note = {
  id: string; kind: 'alert' | 'reminder' | 'insight' | 'activity'; tone: string; icon: string
  title: string; body: string; amount: number; tx_id: string; link: string; read: boolean; at: string
}

const EVT = 'nuru:unread'
let last = 0

// setUnread lets pages that already know the count update every badge.
export function setUnread(n: number) {
  last = n
  dispatchEvent(new CustomEvent(EVT, { detail: n }))
}

export async function refreshUnread() {
  if (!token()) return
  try { setUnread((await api<{ unread: number }>('/notifications?count=1')).unread) } catch { /* offline */ }
}

// useUnread returns the unread count and refreshes it every minute.
export function useUnread() {
  const [n, setN] = useState(last)
  useEffect(() => {
    const on = (e: Event) => setN((e as CustomEvent<number>).detail)
    addEventListener(EVT, on)
    refreshUnread()
    const id = setInterval(refreshUnread, 60000)
    return () => { removeEventListener(EVT, on); clearInterval(id) }
  }, [])
  return n
}
