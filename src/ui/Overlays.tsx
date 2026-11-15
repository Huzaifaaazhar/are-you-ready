import { AnimatePresence } from 'framer-motion'
import { useGame } from '../store/useGame'
import { ArcadePanel } from './minigames/ArcadePanel'
import {
  AchievementsPanel, GatePanel, InfoPanel, InventoryPanel, MapPanel, PausePanel, ProfilePanel, ScoresPanel, SettingsPanel, ShopPanel,
} from './panels/Panels'
import { DialoguePanel, MarketPanel, QuestLogPanel } from './panels/SocialPanels'
import { EndingPanel, PrepPanel, SdFailPanel } from './panels/FinalePanels'
import { CipherPanel, GaragePanel, JournalPanel, MonumentPanel, RaceResultPanel, TrialIntroPanel, TrialResultPanel } from './panels/HuntPanels'

/** Routes the active overlay to its panel. */
export function Overlays() {
  const overlay = useGame((s) => s.overlay)
  const close = useGame((s) => s.closeOverlay)
  let el: React.ReactNode = null
  if (overlay) {
    switch (overlay.type) {
      case 'pause': el = <PausePanel close={close} />; break
      case 'settings': el = <SettingsPanel />; break
      case 'inventory': el = <InventoryPanel close={close} />; break
      case 'profile': el = <ProfilePanel close={close} />; break
      case 'achievements': el = <AchievementsPanel close={close} />; break
      case 'map': el = <MapPanel close={close} />; break
      case 'shop': el = <ShopPanel close={close} />; break
      case 'gate': el = <GatePanel close={close} />; break
      case 'scores': el = <ScoresPanel close={close} />; break
      case 'arcade': el = <ArcadePanel game={overlay.game} close={close} />; break
      case 'info': el = <InfoPanel overlay={overlay} close={close} />; break
      case 'journal': el = <JournalPanel close={close} />; break
      case 'dialogue': el = <DialoguePanel npc={overlay.npc} close={close} />; break
      case 'market': el = <MarketPanel close={close} />; break
      case 'quests': el = <QuestLogPanel close={close} />; break
      case 'prep': el = <PrepPanel close={close} />; break
      case 'ending': el = <EndingPanel choice={overlay.choice} close={close} />; break
      case 'sd-fail': el = <SdFailPanel title={overlay.title} body={overlay.body} close={close} />; break
      case 'cipher': el = <CipherPanel close={close} />; break
      case 'garage': el = <GaragePanel />; break
      case 'race-result': el = <RaceResultPanel />; break
      case 'monument': el = <MonumentPanel close={close} />; break
      case 'trial-intro': el = <TrialIntroPanel trial={overlay.trial} close={close} />; break
      case 'trial-result': el = <TrialResultPanel trial={overlay.trial} success={overlay.success} title={overlay.title} body={overlay.body} close={close} />; break
    }
  }
  return <AnimatePresence mode="wait">{el && <div key={overlay?.type + (overlay?.type === 'info' ? overlay.title : overlay?.type === 'dialogue' ? overlay.npc : '')}>{el}</div>}</AnimatePresence>
}
