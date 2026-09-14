import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    QRCode?: new (el: HTMLElement, opts: { text: string; width: number; height: number }) => unknown
  }
}

export function PixQrCode({ payload, size = 180 }: { payload: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !window.QRCode) return
    ref.current.innerHTML = ''
    new window.QRCode(ref.current, { text: payload, width: size, height: size })
  }, [payload, size])

  return <div ref={ref} style={{ display: 'inline-block', lineHeight: 0 }} />
}
