import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (value: number) => void
}

/**
 * Input numérico que não força "0" enquanto o usuário está digitando/apagando.
 * Um <input type="number" value={n}> comum reescreve o texto a cada tecla a partir
 * do número já convertido, então limpar o campo (ficando vazio) imediatamente
 * volta a mostrar "0" e atrapalha digitar um novo valor. Aqui o texto exibido só é
 * ressincronizado com o valor externo quando o campo NÃO está focado.
 */
export function NumberInput({ value, onChange, className, ...rest }: Props) {
  const [local, setLocal] = useState(String(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setLocal(String(value))
  }, [value])

  return (
    <input
      type="number"
      className={className ?? 'lya-input'}
      value={local}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        const n = parseFloat(local)
        const final = isNaN(n) ? 0 : n
        setLocal(String(final))
        onChange(final)
      }}
      onChange={(e) => {
        setLocal(e.target.value)
        const n = parseFloat(e.target.value)
        if (!isNaN(n)) onChange(n)
      }}
      {...rest}
    />
  )
}
