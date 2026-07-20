import { prisma } from "@/lib/prisma";

/** PRD §7.1 / §5 — the opt-in gate for the Browser Automation discovery provider, plus theme preference. */
export class SettingsService {
  async get() {
    return prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  }

  async setResearchMode(enabled: boolean) {
    return prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, researchModeEnabled: enabled },
      update: { researchModeEnabled: enabled },
    });
  }

  async setTheme(theme: "system" | "light" | "dark") {
    return prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, theme },
      update: { theme },
    });
  }
}

export const settingsService = new SettingsService();
