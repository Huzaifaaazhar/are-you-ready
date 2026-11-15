import { create } from 'zustand'
import { useEffect } from 'react'
import type { TrialId, Vec3 } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { Portal } from '../common/Portal'

/** Small HUD + retry hook shared by the three trials. */
interface TrialHud {
  trial: TrialId | null
  status: string[]
  retry: (() => void) | null
  set: (p: Partial<Omit<TrialHud, 'set'>>) => void
}
export const useTrialHud = create<TrialHud>((set) => ({ trial: null, status: [], retry: null, set: (p) => set(p) }))

export const TRIAL_TEXT: Record<TrialId, { title: string; color: string; intro: string[]; objectives: string[] }> = {
  past: {
    title: 'Trial I · The Past',
    color: '#ff9a4d',
    intro: [
      'You step into a memory the Founder sealed away: a basement in 1989, preserved down to the dust.',
      'Four memories lie scattered around the room. The projector will only replay them in the order they were lived.',
      'Restore the memory, then prove you understand what the Founder lost.',
    ],
    objectives: ['Find the four memory objects (E to pick up, one at a time)', 'Place them on the projector pedestals I–IV in the order they happened', 'Act on what the restored memory reveals', 'Wrong orders cost integrity — at zero the memory collapses and resets'],
  },
  present: {
    title: 'Trial II · The Present',
    color: '#4d7cff',
    intro: [
      'The Consortium wants to own the OASIS and charge for every door. Their tower holds the Prism Key.',
      'Slip past their security drones and cameras, open the server vault, and reach the executive office.',
      'There, you will be made an offer. What you choose decides whether you pass.',
    ],
    objectives: ['Stay out of the drones’ red vision cones (pillars and racks block their sight)', 'Open the server-vault door with the passphrase the Consortium stole from the Arcade District', 'Reach the executive office and decide', 'Being spotted sends you back to the zone checkpoint'],
  },
  future: {
    title: 'Trial III · The Future',
    color: '#9fe8ff',
    intro: [
      'The Blueprint is where the OASIS is built. Nothing here is fixed — only light and imagination.',
      'Route the emitter’s light into all three receivers using the mirrors and the splitter you are given. There is more than one way.',
      'Then design a monument of your own. It will stand in OASIS Prime for everyone to see.',
    ],
    objectives: ['Stand on a grid cell and press E to place or rotate a piece (/ → \\ → splitter → empty)', 'Fire the emitter from the switch on the west side to test your design', 'Light all three receivers at once', 'Keep the beam off the red corruption nodes — after 4 seconds they overload and reset the board', 'Build your monument in the forge'],
  },
}

/** Opens the intro panel on arrival and clears the HUD on exit. */
export function useTrialSetup(trial: TrialId, retry: () => void) {
  useEffect(() => {
    useTrialHud.getState().set({ trial, status: [], retry })
    const g = useGame.getState()
    if (!g.progress.trials.includes(trial)) g.openOverlay({ type: 'trial-intro', trial })
    return () => useTrialHud.getState().set({ trial: null, status: [], retry: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function TrialExit({ position, rotationY = Math.PI }: { position: Vec3; rotationY?: number }) {
  return <Portal id="trial-exit" position={position} rotationY={rotationY} label="OASIS PRIME" sublabel="leave the trial" color="#00f0ff" color2="#9d4dff" target="hub" spawnId="fromTrials" radius={2.2} />
}

export function failTrial(trial: TrialId, title: string, body: string[]) {
  useGame.getState().openOverlay({ type: 'trial-result', trial, success: false, title, body })
}
