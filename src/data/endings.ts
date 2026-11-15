import type { EndingId, FinalOutcome, Progress } from '../store/useGame'

export const ENDING_CHOICES: { id: EndingId; title: string; value: string; color: string; pitch: string; cost: string }[] = [
  {
    id: 'open',
    title: 'The Open Door',
    value: 'Community',
    color: '#3dff8b',
    pitch: 'Give the Founder’s keys to everyone. A council of players runs the OASIS together.',
    cost: 'Nobody owns it — not even you. It will be loud, slow and argumentative.',
  },
  {
    id: 'caretaker',
    title: 'The Caretaker',
    value: 'Stewardship',
    color: '#ffe14d',
    pitch: 'Take the Founder’s chair. Guard the OASIS yourself and shape what it becomes.',
    cost: 'The chair is lonely. You will build more than you play.',
  },
  {
    id: 'rest',
    title: 'The Rest Day',
    value: 'Balance',
    color: '#9fe8ff',
    pitch: 'Keep the OASIS free, but let it sleep one day a week so people meet outside.',
    cost: 'Some players will never forgive you for Tuesdays.',
  },
]

const HELPERS: { quest: string; line: string }[] = [
  { quest: 'q-lostdata', line: 'Patch’s restored help-desk answers its first ticket in years.' },
  { quest: 'q-rooftop', line: 'Dash teaches a new generation of couriers the route to the Skyline Garden.' },
  { quest: 'q-courier', line: 'Dame Ysolde keeps Dash’s package, unopened, in the castle hall.' },
  { quest: 'q-artefact', line: 'The Aether Crystal hums in the hidden garden, remembering everyone who climbed to it.' },
  { quest: 'q-ghost', line: 'Echo finally logs off, smiling.' },
  { quest: 'q-legend', line: 'Old Byte hangs a picture of you over the Neon Serpent cabinet.' },
  { quest: 'q-timetrial', line: 'Captain Vex names a corner of Velocity City after you. She still says you brake too early.' },
  { quest: 'q-explorer', line: 'Glimmer’s new-arrival tour now includes three worlds you charted first.' },
]

/** Compose the ending: the choice sets the story; progress and the gift change the details. */
export function composeEnding(outcome: FinalOutcome, p: Progress, playerName: string) {
  const choice = ENDING_CHOICES.find((c) => c.id === outcome.ending)!
  const paras: string[] = []
  if (outcome.ending === 'open') {
    paras.push(`${playerName} sets the Founder’s keys on the floor of the Core and opens every door at once. By morning, a council of ten thousand players is arguing about the colour of the plaza.`)
    paras.push('The OASIS stays free. It stays messy. Nobody will ever own it again — and that includes you, which is exactly what you wanted.')
  } else if (outcome.ending === 'caretaker') {
    paras.push(`${playerName} sits down in the Founder’s chair. The OASIS stretches out beneath you like a map you are allowed to redraw.`)
    paras.push('You patch the holes the Consortium left, you keep the doors free, you answer every bug report. Some nights you watch the arcade from far above and wish you were down there, playing.')
  } else {
    paras.push(`${playerName} keeps the OASIS free — and gives it a rest. One day a week, the servers dim and the plaza falls quiet.`)
    paras.push('On the first rest day, people log off and blink at the sun. Some of them meet the friends they only knew as avatars. The OASIS is waiting for them when they come back, a little better for missing them.')
  }
  if (p.trials.includes('past')) paras.push('Somewhere in the memory archive, two controllers sit side by side. Rook was right: the best games are the ones you play together.')
  if (p.monument) paras.push(`Your monument still stands in OASIS Prime. New arrivals take pictures in front of it without knowing who built it.`)
  const helpers = HELPERS.filter((h) => p.quests[h.quest] === 'done').map((h) => h.line)
  if (outcome.gift === 'chronos') paras.push('The Chronos gift lingers: whenever you need it, the world seems to slow down just enough.')
  if (outcome.gift === 'aegis') paras.push('The Aegis gift fades from your avatar, but players say you never seem to lose a fight you care about.')
  if (outcome.gift === 'beacon') paras.push('The Beacon gift becomes a lighthouse on the edge of the plaza, guiding lost players home.')
  const epilogue = helpers.length ? helpers : ['You wonder about the residents you never had time to help. They are still out there, waiting with their quests.']
  return { title: choice.title, value: choice.value, color: choice.color, paras, epilogue, rank: outcome.rank, completion: outcome.completion }
}
