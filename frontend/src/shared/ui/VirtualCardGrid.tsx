import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

/**
 * Grade de cards com virtualizacao de linhas: so monta no DOM as linhas
 * proximas da area visivel, para telas com centenas/milhares de itens
 * (ex.: Mesa de Producao) nao acumularem dezenas de milhares de nos DOM.
 * Mantem o mesmo comportamento responsivo do CSS grid `auto-fill` original,
 * calculando quantas colunas cabem na largura atual do container.
 */
export function VirtualCardGrid<T>({
  items,
  keyExtractor,
  renderItem,
  minColumnWidth = 280,
  gap = 20,
  estimateRowHeight = 340,
  maxHeight = '75vh',
  emptyState,
}: {
  items: T[]
  keyExtractor: (item: T) => string
  renderItem: (item: T) => ReactNode
  minColumnWidth?: number
  gap?: number
  estimateRowHeight?: number
  maxHeight?: string | number
  emptyState?: ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const compute = () => {
      const width = el.clientWidth
      const cols = Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)))
      setColumns(cols)
    }
    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(el)
    return () => observer.disconnect()
  }, [gap, minColumnWidth])

  const rows = useMemo(() => {
    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += columns) {
      chunks.push(items.slice(i, i + columns))
    }
    return chunks
  }, [items, columns])

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 3,
  })

  // O container abaixo (com o ref usado para medir a largura via ResizeObserver)
  // precisa ficar sempre montado, mesmo com a lista vazia. Antes, esse caso
  // retornava so o emptyState mais cedo, entao o primeiro item que aparecia
  // (ex.: apos criar o unico lote do ateliê) montava o container pela primeira
  // vez SEM disparar o effect de novo (suas deps sao so gap/minColumnWidth),
  // ficando com "columns" no valor inicial (1) ate um F5 remontar tudo do zero.
  return (
    <div ref={scrollRef} style={{ maxHeight, overflowY: 'auto' }}>
      {items.length === 0 ? (
        emptyState
      ) : (
        <div style={{ position: 'relative', height: rowVirtualizer.getTotalSize(), width: '100%' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap,
                  paddingBottom: gap,
                }}
              >
                {row.map((item) => (
                  <div key={keyExtractor(item)}>{renderItem(item)}</div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
