import { describe, expect, it } from "vitest";
import { designThemeIds, designThemes, normalizeDesignTheme } from "@/lib/design-themes";

describe("design themes", () => {
  it("normalizes invalid values to the default bridal theme", () => {
    expect(normalizeDesignTheme("quiz_show")).toBe("quiz_show");
    expect(normalizeDesignTheme("unknown")).toBe("classic_bridal");
    expect(normalizeDesignTheme(null)).toBe("classic_bridal");
  });

  it("defines all theme ids with visible swatches and css variables", () => {
    expect(designThemeIds).toHaveLength(5);

    for (const themeId of designThemeIds) {
      const theme = designThemes[themeId];
      expect(theme.id).toBe(themeId);
      expect(theme.name).toBeTruthy();
      expect(theme.swatches).toHaveLength(4);
      expect(theme.vars).toHaveProperty("--wql-page-gradient");
      expect(theme.vars).toHaveProperty("--wql-screen-gradient");
    }
  });
});
