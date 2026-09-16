import type { WorkItem } from './workQueue.api'
import { toast } from '../../shared/ui/toast/toastStore'

declare global {
  interface Window {
    QRCode?: new (el: HTMLElement, opts: { text: string; width: number; height: number }) => unknown
  }
}

/**
 * Imprime uma folha com várias etiquetas do mesmo lote (uma por peça do fardo + 2 reservas,
 * igual ao padrão do sistema legado), em grade legível — QR grande o bastante pra escanear
 * mesmo impresso pequeno.
 */
export function printLoteLabel(item: WorkItem, atelierNome: string) {
  if (!window.QRCode) {
    toast.error('Biblioteca de QR code ainda não carregou, tente novamente em instantes.')
    return
  }

  const confirmUrl = `${window.location.origin}/v2/confirm/${item._id}`
  const copies = Math.max(1, (item.specs.quantidadeFardo || 1) + 2)

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  document.body.appendChild(container)
  new window.QRCode(container, { text: confirmUrl, width: 240, height: 240 })

  setTimeout(() => {
    const canvas = container.querySelector('canvas')
    const dataUrl = canvas ? canvas.toDataURL('image/png') : ''
    document.body.removeChild(container)

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return

    const specsLine = `${item.specs.percentualSombreamento}% ${item.specs.corTecido} · ${item.specs.larguraBobina}m × ${item.specs.comprimentoBobina}m${item.specs.emenda ? ' · Emenda' : ''}`

    const label = `
      <div class="label">
        <img src="${dataUrl}" alt="QR Code" />
        <div class="code">${item.code}</div>
        <div class="atelier">${atelierNome}</div>
        <div class="specs">${specsLine}</div>
      </div>
    `

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Etiquetas ${item.code}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, 'Segoe UI', sans-serif;
              margin: 0;
              padding: 0;
            }
            .sheet {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 6mm;
            }
            .label {
              border: 1.5px dashed #94a3b8;
              border-radius: 6px;
              padding: 8mm 4mm;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .label img {
              width: 34mm;
              height: 34mm;
              image-rendering: pixelated;
            }
            .label .code {
              font-family: 'Courier New', monospace;
              font-size: 15pt;
              font-weight: 800;
              margin-top: 3mm;
              color: #0f172a;
            }
            .label .atelier {
              font-size: 9pt;
              color: #475569;
              margin-top: 1mm;
            }
            .label .specs {
              font-size: 7.5pt;
              color: #334155;
              margin-top: 2mm;
              line-height: 1.3;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            ${label.repeat(copies)}
          </div>
          <script>
            window.onload = function () {
              window.print();
              setTimeout(function () { window.close(); }, 300);
            };
          </script>
        </body>
      </html>
    `)
    win.document.close()
  }, 150)
}
