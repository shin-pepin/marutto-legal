import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPageTypeConfig,
  getAllPageTypes,
  getTemplateUpdates,
} from "../pageTypes/registry";
import "../pageTypes"; // register all page types

describe("templateVersion and versionHistory", () => {
  const pageTypes = ["tokushoho", "privacy", "terms", "return"];

  for (const pt of pageTypes) {
    it(`${pt} has templateVersion >= 1`, () => {
      const config = getPageTypeConfig(pt);
      expect(config).toBeDefined();
      expect(config!.templateVersion).toBeGreaterThanOrEqual(1);
    });

    it(`${pt} has non-empty versionHistory`, () => {
      const config = getPageTypeConfig(pt);
      expect(config!.versionHistory).toBeDefined();
      expect(config!.versionHistory.length).toBeGreaterThanOrEqual(1);
    });

    it(`${pt} versionHistory includes templateVersion entry`, () => {
      const config = getPageTypeConfig(pt);
      const versions = config!.versionHistory.map((v) => v.version);
      expect(versions).toContain(config!.templateVersion);
    });

    it(`${pt} versionHistory entries have required fields`, () => {
      const config = getPageTypeConfig(pt);
      for (const entry of config!.versionHistory) {
        expect(entry.version).toBeGreaterThanOrEqual(1);
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry.summary.length).toBeGreaterThan(0);
      }
    });
  }

  it("all page types have templateVersion field", () => {
    const allTypes = getAllPageTypes();
    expect(allTypes.length).toBeGreaterThanOrEqual(4);
    for (const config of allTypes) {
      expect(config.templateVersion).toBeDefined();
      expect(typeof config.templateVersion).toBe("number");
    }
  });
});

describe("getTemplateUpdates", () => {
  it("returns empty array when currentVersion matches templateVersion", () => {
    const config = getPageTypeConfig("tokushoho")!;
    const updates = getTemplateUpdates("tokushoho", config.templateVersion);
    expect(updates).toEqual([]);
  });

  it("returns empty array for unknown page type", () => {
    const updates = getTemplateUpdates("nonexistent", 1);
    expect(updates).toEqual([]);
  });

  it("returns pending updates when currentVersion < templateVersion", () => {
    // currentVersion 0 should return all history entries
    const updates = getTemplateUpdates("tokushoho", 0);
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[0].version).toBe(1);
  });

  it("returns updates sorted ascending by version", () => {
    const updates = getTemplateUpdates("privacy", 0);
    for (let i = 1; i < updates.length; i++) {
      expect(updates[i].version).toBeGreaterThan(updates[i - 1].version);
    }
  });

  it("returns only updates newer than currentVersion", () => {
    const config = getPageTypeConfig("terms")!;
    // If version history has entry at version 1 and we pass currentVersion 1,
    // should return nothing
    const updates = getTemplateUpdates("terms", config.templateVersion);
    expect(updates).toEqual([]);

    // Pass version 0 → should return version 1
    const allUpdates = getTemplateUpdates("terms", 0);
    for (const update of allUpdates) {
      expect(update.version).toBeGreaterThan(0);
    }
  });
});

describe("updateLegalPageVersion", () => {
  const { mockUpdate, mockUpdateMany, mockFindUniqueOrThrow } = vi.hoisted(() => ({
    mockUpdate: vi.fn().mockResolvedValue({
      id: "page-1",
      formSchemaVersion: 2,
      contentHtml: "<p>updated</p>",
    }),
    mockUpdateMany: vi.fn().mockResolvedValue({ count: 1 }),
    mockFindUniqueOrThrow: vi.fn().mockResolvedValue({
      id: "page-1",
      formSchemaVersion: 2,
      contentHtml: "<p>updated</p>",
    }),
  }));

  vi.mock("../../db.server", () => ({
    default: {
      legalPage: {
        update: (...args: unknown[]) => mockUpdate(...args),
        updateMany: (...args: unknown[]) => mockUpdateMany(...args),
        findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
      },
    },
  }));

  vi.mock("../crypto.server", () => ({
    encryptFormData: (data: string) => `encrypted:${data}`,
    decryptFormData: (data: string) => data.replace("encrypted:", ""),
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls DB update without optimistic lock by default", async () => {
    const { updateLegalPageVersion } = await import("../db/legalPage.server");
    await updateLegalPageVersion("page-1", 2, "<p>updated</p>");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "page-1" },
      data: {
        contentHtml: "<p>updated</p>",
        formSchemaVersion: 2,
        version: { increment: 1 },
      },
    });
  });

  it("includes shopifyPageId when provided", async () => {
    const { updateLegalPageVersion } = await import("../db/legalPage.server");
    await updateLegalPageVersion("page-1", 2, "<p>updated</p>", {
      shopifyPageId: "gid://shopify/Page/99",
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "page-1" },
      data: {
        contentHtml: "<p>updated</p>",
        formSchemaVersion: 2,
        version: { increment: 1 },
        shopifyPageId: "gid://shopify/Page/99",
      },
    });
  });

  it("uses optimistic locking when expectedVersion is provided", async () => {
    const { updateLegalPageVersion } = await import("../db/legalPage.server");
    await updateLegalPageVersion("page-1", 2, "<p>updated</p>", {
      expectedVersion: 3,
    });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "page-1", version: 3 },
      data: expect.objectContaining({
        contentHtml: "<p>updated</p>",
        formSchemaVersion: 2,
        version: 4,
      }),
    });
  });

  it("throws OptimisticLockError when version mismatch", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    const { updateLegalPageVersion, OptimisticLockError } = await import("../db/legalPage.server");
    await expect(
      updateLegalPageVersion("page-1", 2, "<p>updated</p>", {
        expectedVersion: 3,
      }),
    ).rejects.toThrow(OptimisticLockError);
  });

  it("returns updated page data", async () => {
    const { updateLegalPageVersion } = await import("../db/legalPage.server");
    const result = await updateLegalPageVersion("page-1", 2, "<p>updated</p>");
    expect(result).toEqual({
      id: "page-1",
      formSchemaVersion: 2,
      contentHtml: "<p>updated</p>",
    });
  });
});
