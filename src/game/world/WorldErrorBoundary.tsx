import { Component, type ReactNode } from 'react'
import type { WorldId } from '../../data/content'
import { useGame } from '../../store/useGame'

/** Catches failures while loading or running a world and hands control to the DOM error panel. */
export class WorldErrorBoundary extends Component<{ worldId: WorldId; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.error('World failed', err)
    useGame.setState({ worldError: String((err as Error)?.message ?? err) })
  }
  componentDidUpdate(prev: { worldId: WorldId }) {
    if (prev.worldId !== this.props.worldId && this.state.failed) this.setState({ failed: false })
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
