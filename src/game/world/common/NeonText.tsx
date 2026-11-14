import { Text } from '@react-three/drei'
import type { ComponentProps } from 'react'
import { FONT_DISPLAY, FONT_MONO, glow } from './materials'

type TextProps = ComponentProps<typeof Text>

interface Props extends Omit<TextProps, 'color'> {
  color?: string
  intensity?: number
  mono?: boolean
}

/** SDF text with HDR colour so it blooms like neon tubing. */
export function NeonText({ color = '#00f0ff', intensity = 2.4, mono, children, ...rest }: Props) {
  return (
    <Text
      font={mono ? FONT_MONO : FONT_DISPLAY}
      anchorX="center"
      anchorY="middle"
      color={glow(color, intensity)}
      material-toneMapped={false}
      {...rest}
    >
      {children}
    </Text>
  )
}
