import { storage } from './storage';

export interface GameSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  sfxEnabled: true,
  musicEnabled: true,
};

const SETTINGS_KEY = 'game_settings';

export const getGameSettings = async (): Promise<GameSettings> => {
  try {
    const stored = await storage.getItem(SETTINGS_KEY, null);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveGameSettings = async (settings: GameSettings): Promise<void> => {
  await storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const updateSetting = async <K extends keyof GameSettings>(
  key: K,
  value: GameSettings[K]
): Promise<GameSettings> => {
  const current = await getGameSettings();
  const updated = { ...current, [key]: value };
  await saveGameSettings(updated);
  return updated;
};
