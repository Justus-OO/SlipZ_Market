// src/services/settings.service.ts
import prisma from '../db';

let cachedSettings: any = null;
let lastFetch = 0;
const CACHE_DURATION = 60000; // Cache for 60 seconds

export const SettingsService = {
  async get() {
    const now = Date.now();

    // Return cached settings if they are fresh
    if (cachedSettings && (now - lastFetch < CACHE_DURATION)) {
      return cachedSettings;
    }

    // Otherwise, fetch from DB
    const settings = await prisma.globalSettings.findUnique({
      where: { id: 'singleton' }
    });

    if (settings) {
      cachedSettings = settings;
      lastFetch = now;
    }

    return settings;
  },

  // Call this whenever you update settings to clear the cache
  clearCache() {
    cachedSettings = null;
    lastFetch = 0;
  }
};