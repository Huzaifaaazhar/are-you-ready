import { create } from 'zustand'
import { DEFAULT_AVATAR, type AvatarConfig } from '../data/avatar'

/** Working copy edited in the avatar creator (only committed to the save on confirm). */
export const useCreator = create<{ draft: AvatarConfig; setDraft: (d: AvatarConfig) => void; patch: (p: Partial<AvatarConfig>) => void }>((set) => ({
  draft: DEFAULT_AVATAR,
  setDraft: (draft) => set({ draft }),
  patch: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
}))
