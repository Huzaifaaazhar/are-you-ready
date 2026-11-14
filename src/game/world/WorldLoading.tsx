import { useEffect } from 'react'
import { useGame } from '../../store/useGame'

/** Suspense fallback inside the canvas: flags the DOM loading veil while a world streams in. */
export function WorldLoading() {
  useEffect(() => {
    useGame.setState({ worldLoading: true })
    return () => {
      useGame.setState({ worldLoading: false })
    }
  }, [])
  return null
}
