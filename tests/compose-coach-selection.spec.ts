import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:5000";

async function apiPost(page: Page, path: string, body: object) {
  const res = await page.request.post(`${BASE}${path}`, { data: body });
  expect(res.ok(), `POST ${path} failed: ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function apiDelete(page: Page, path: string) {
  await page.request.delete(`${BASE}${path}`);
}

function uid() {
  return `t${Date.now()}${Math.floor(Math.random() * 9999)}`;
}

async function seedCoach(page: Page, overrides: Partial<{
  name: string; email: string; school: string;
  state: string; status: string; division: string; favorite: boolean;
}> = {}) {
  const id = uid();
  const coach = await apiPost(page, "/api/coaches", {
    name: overrides.name ?? `Coach-${id}`,
    email: overrides.email ?? `coach-${id}@test.com`,
    school: overrides.school ?? `School-${id}`,
    state: overrides.state ?? null,
    status: overrides.status ?? "not_contacted",
    division: overrides.division ?? null,
    favorite: overrides.favorite ?? false,
  });
  return coach as { id: string };
}

const ALL_STATUS_VALUES = [
  "not_contacted",
  "contacted",
  "awaiting_response",
  "follow_up_needed",
  "responded",
] as const;

test.describe("Status filter chips — each chip filters independently", () => {
  for (const status of ALL_STATUS_VALUES) {
    test(`activating '${status}' chip shows only coaches with that status`, async ({ page }) => {
      const id = uid();
      const targetCoach = await seedCoach(page, {
        name: `Target-${status}-${id}`,
        email: `target-${status}-${id}@t.com`,
        school: `ChipTest-${id}`,
        status,
      });
      const otherStatus = status === "not_contacted" ? "responded" : "not_contacted";
      const otherCoach = await seedCoach(page, {
        name: `Other-${id}`,
        email: `other-${id}@t.com`,
        school: `ChipTest-${id}`,
        status: otherStatus,
      });

      try {
        await page.goto(`${BASE}/compose`);
        await page.waitForSelector('[data-testid="status-filter-chips"]');

        await page.locator('[data-testid="input-coach-search"]').fill(`ChipTest-${id}`);
        await page.waitForTimeout(200);

        await page.locator(`[data-testid="chip-status-${status}"]`).click();

        await expect(page.locator(`[data-testid="coach-recipient-${targetCoach.id}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="coach-recipient-${otherCoach.id}"]`)).not.toBeVisible();
      } finally {
        await apiDelete(page, `/api/coaches/${targetCoach.id}`);
        await apiDelete(page, `/api/coaches/${otherCoach.id}`);
      }
    });
  }

  test("activating two chips shows coaches matching either status (OR logic)", async ({ page }) => {
    const id = uid();
    const ncCoach = await seedCoach(page, { name: `NC-${id}`, email: `nc-${id}@t.com`, school: `ChipOR-${id}`, status: "not_contacted" });
    const ctCoach = await seedCoach(page, { name: `CT-${id}`, email: `ct-${id}@t.com`, school: `ChipOR-${id}`, status: "contacted" });
    const rdCoach = await seedCoach(page, { name: `RD-${id}`, email: `rd-${id}@t.com`, school: `ChipOR-${id}`, status: "responded" });

    try {
      await page.goto(`${BASE}/compose`);
      await page.waitForSelector('[data-testid="status-filter-chips"]');

      await page.locator('[data-testid="input-coach-search"]').fill(`ChipOR-${id}`);
      await page.waitForTimeout(200);

      await page.locator('[data-testid="chip-status-not_contacted"]').click();
      await page.locator('[data-testid="chip-status-contacted"]').click();

      await expect(page.locator(`[data-testid="coach-recipient-${ncCoach.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="coach-recipient-${ctCoach.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="coach-recipient-${rdCoach.id}"]`)).not.toBeVisible();
    } finally {
      await apiDelete(page, `/api/coaches/${ncCoach.id}`);
      await apiDelete(page, `/api/coaches/${ctCoach.id}`);
      await apiDelete(page, `/api/coaches/${rdCoach.id}`);
    }
  });

  test("clear-all button removes all status filters and restores full list", async ({ page }) => {
    const id = uid();
    const c1 = await seedCoach(page, { name: `A-${id}`, email: `a-${id}@t.com`, school: `ChipClr-${id}`, status: "not_contacted" });
    const c2 = await seedCoach(page, { name: `B-${id}`, email: `b-${id}@t.com`, school: `ChipClr-${id}`, status: "responded" });

    try {
      await page.goto(`${BASE}/compose`);
      await page.waitForSelector('[data-testid="status-filter-chips"]');

      await page.locator('[data-testid="input-coach-search"]').fill(`ChipClr-${id}`);
      await page.waitForTimeout(200);

      await page.locator('[data-testid="chip-status-not_contacted"]').click();

      await expect(page.locator(`[data-testid="coach-recipient-${c1.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="coach-recipient-${c2.id}"]`)).not.toBeVisible();

      await page.locator('[data-testid="chip-status-clear"]').click();

      await expect(page.locator(`[data-testid="coach-recipient-${c1.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="coach-recipient-${c2.id}"]`)).toBeVisible();
      await expect(page.locator('[data-testid="chip-status-clear"]')).not.toBeVisible();
    } finally {
      await apiDelete(page, `/api/coaches/${c1.id}`);
      await apiDelete(page, `/api/coaches/${c2.id}`);
    }
  });
});

test.describe("State filter", () => {
  test("filters the recipient list to coaches in the selected state only", async ({ page }) => {
    const id = uid();
    const caCoach = await seedCoach(page, { name: `CA-${id}`, email: `ca-${id}@t.com`, school: `S-${id}`, state: "CA" });
    const nyCoach = await seedCoach(page, { name: `NY-${id}`, email: `ny-${id}@t.com`, school: `S-${id}`, state: "NY" });

    try {
      await page.goto(`${BASE}/compose`);
      await page.waitForSelector('[data-testid="select-state-filter"]');

      await page.locator('[data-testid="select-state-filter"]').click();
      await page.locator('[role="option"]', { hasText: "CA" }).click();

      await expect(page.locator(`[data-testid="coach-recipient-${caCoach.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="coach-recipient-${nyCoach.id}"]`)).not.toBeVisible();

      const summary = page.locator('[data-testid="filter-summary"]');
      await expect(summary).toContainText("match");
    } finally {
      await apiDelete(page, `/api/coaches/${caCoach.id}`);
      await apiDelete(page, `/api/coaches/${nyCoach.id}`);
    }
  });
});

test.describe("Sort modes", () => {
  test("sort dropdown has all four required modes and defaults to Favorites First", async ({ page }) => {
    await page.goto(`${BASE}/compose`);
    const sortSelect = page.locator('[data-testid="select-sort-mode"]');
    await expect(sortSelect).toContainText("Favorites First");

    await sortSelect.click();
    await expect(page.locator('[role="option"]', { hasText: "Favorites First" })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: "A → Z" })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: "By Division" })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: "Last Contacted (oldest)" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("Favorites First sort places favorite coaches before non-favorites", async ({ page }) => {
    const id = uid();
    const fav = await seedCoach(page, {
      name: `ZZZ-Fav-${id}`, email: `fav-${id}@t.com`, school: `S-${id}`, favorite: true,
    });
    const nonFav = await seedCoach(page, {
      name: `AAA-NonFav-${id}`, email: `nf-${id}@t.com`, school: `S-${id}`, favorite: false,
    });

    try {
      await page.goto(`${BASE}/compose`);
      const sortSelect = page.locator('[data-testid="select-sort-mode"]');
      await sortSelect.click();
      await page.locator('[role="option"]', { hasText: "Favorites First" }).click();

      const rows = page.locator('[data-testid^="coach-recipient-"]');
      const allIds = await rows.evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-testid")?.replace("coach-recipient-", ""))
      );
      const favIndex = allIds.indexOf(fav.id);
      const nonFavIndex = allIds.indexOf(nonFav.id);
      expect(favIndex).toBeGreaterThanOrEqual(0);
      expect(nonFavIndex).toBeGreaterThanOrEqual(0);
      expect(favIndex).toBeLessThan(nonFavIndex);
    } finally {
      await apiDelete(page, `/api/coaches/${fav.id}`);
      await apiDelete(page, `/api/coaches/${nonFav.id}`);
    }
  });

  test("A→Z sort orders coaches alphabetically by name", async ({ page }) => {
    const id = uid();
    const aCoach = await seedCoach(page, { name: `Aaron-${id}`, email: `a-${id}@t.com`, school: `S-${id}` });
    const zCoach = await seedCoach(page, { name: `Zara-${id}`, email: `z-${id}@t.com`, school: `S-${id}` });

    try {
      await page.goto(`${BASE}/compose`);
      const sortSelect = page.locator('[data-testid="select-sort-mode"]');
      await sortSelect.click();
      await page.locator('[role="option"]', { hasText: "A → Z" }).click();

      const rows = page.locator('[data-testid^="coach-recipient-"]');
      const allIds = await rows.evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-testid")?.replace("coach-recipient-", ""))
      );
      const aIdx = allIds.indexOf(aCoach.id);
      const zIdx = allIds.indexOf(zCoach.id);
      expect(aIdx).toBeGreaterThanOrEqual(0);
      expect(zIdx).toBeGreaterThanOrEqual(0);
      expect(aIdx).toBeLessThan(zIdx);
    } finally {
      await apiDelete(page, `/api/coaches/${aCoach.id}`);
      await apiDelete(page, `/api/coaches/${zCoach.id}`);
    }
  });

  test("By Division sort places D1 coaches before D2 coaches", async ({ page }) => {
    const id = uid();
    const d2Coach = await seedCoach(page, { name: `D2-Coach-${id}`, email: `d2-${id}@t.com`, school: `S-${id}`, division: "D2", favorite: false });
    const d1Coach = await seedCoach(page, { name: `D1-Coach-${id}`, email: `d1-${id}@t.com`, school: `S-${id}`, division: "D1", favorite: false });

    try {
      await page.goto(`${BASE}/compose`);
      const sortSelect = page.locator('[data-testid="select-sort-mode"]');
      await sortSelect.click();
      await page.locator('[role="option"]', { hasText: "By Division" }).click();

      const rows = page.locator('[data-testid^="coach-recipient-"]');
      const allIds = await rows.evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-testid")?.replace("coach-recipient-", ""))
      );
      const d1Idx = allIds.indexOf(d1Coach.id);
      const d2Idx = allIds.indexOf(d2Coach.id);
      expect(d1Idx).toBeGreaterThanOrEqual(0);
      expect(d2Idx).toBeGreaterThanOrEqual(0);
      expect(d1Idx).toBeLessThan(d2Idx);
    } finally {
      await apiDelete(page, `/api/coaches/${d1Coach.id}`);
      await apiDelete(page, `/api/coaches/${d2Coach.id}`);
    }
  });

  test("Last Contacted (oldest first) places the oldest-contacted coach before the recently-contacted one", async ({ page }) => {
    const id = uid();
    const olderCoach = await seedCoach(page, { name: `Older-${id}`, email: `older-${id}@t.com`, school: `S-${id}` });
    const newerCoach = await seedCoach(page, { name: `Newer-${id}`, email: `newer-${id}@t.com`, school: `S-${id}` });

    await apiPost(page, "/api/contacts", {
      coachId: olderCoach.id,
      method: "email",
      notes: "Older contact",
      date: "2024-01-01",
    });
    await page.waitForTimeout(100);
    await apiPost(page, "/api/contacts", {
      coachId: newerCoach.id,
      method: "email",
      notes: "Newer contact",
      date: "2025-06-01",
    });

    try {
      await page.goto(`${BASE}/compose`);
      const sortSelect = page.locator('[data-testid="select-sort-mode"]');
      await sortSelect.click();
      await page.locator('[role="option"]', { hasText: "Last Contacted (oldest)" }).click();

      const rows = page.locator('[data-testid^="coach-recipient-"]');
      const allIds = await rows.evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-testid")?.replace("coach-recipient-", ""))
      );
      const olderIdx = allIds.indexOf(olderCoach.id);
      const newerIdx = allIds.indexOf(newerCoach.id);
      expect(olderIdx).toBeGreaterThanOrEqual(0);
      expect(newerIdx).toBeGreaterThanOrEqual(0);
      expect(olderIdx).toBeLessThan(newerIdx);
    } finally {
      await apiDelete(page, `/api/coaches/${olderCoach.id}`);
      await apiDelete(page, `/api/coaches/${newerCoach.id}`);
    }
  });
});

test.describe("100-recipient hard cap", () => {
  test("select-all seeds 100 coaches and select-all selects exactly 100, with remaining checkboxes disabled", async ({ page }) => {
    const id = uid();
    const coaches: { id: string }[] = [];

    for (let i = 0; i < 102; i++) {
      const c = await seedCoach(page, {
        name: `Cap-${id}-${String(i).padStart(3, "0")}`,
        email: `cap${i}-${id}@t.com`,
        school: `CapSchool-${id}`,
        status: "not_contacted",
      });
      coaches.push(c);
    }

    try {
      await page.goto(`${BASE}/compose`);
      await page.waitForSelector('[data-testid="checkbox-select-all"]');

      await page.locator('[data-testid="input-coach-search"]').fill(`CapSchool-${id}`);
      await page.waitForTimeout(300);

      const summary = page.locator('[data-testid="filter-summary"]');
      await expect(summary).toContainText("match");

      await page.locator('[data-testid="checkbox-select-all"]').click();

      const selectedCount = page.locator('[data-testid="text-selected-count"]');
      await expect(selectedCount).toContainText("100/100 selected");

      const disabledCheckbox = page.locator(
        `[data-testid="checkbox-coach-${coaches[101].id}"]`
      );
      await expect(disabledCheckbox).toBeDisabled();
    } finally {
      for (const c of coaches) {
        await apiDelete(page, `/api/coaches/${c.id}`);
      }
    }
  });
});

test.describe("Reset filters", () => {
  test("Reset filters link restores the full unfiltered coach list", async ({ page }) => {
    const id = uid();
    const c1 = await seedCoach(page, { name: `Rst-${id}-nc`, email: `rnc-${id}@t.com`, school: `S-${id}`, status: "not_contacted" });
    const c2 = await seedCoach(page, { name: `Rst-${id}-rd`, email: `rrd-${id}@t.com`, school: `S-${id}`, status: "responded" });

    try {
      await page.goto(`${BASE}/compose`);
      await page.waitForSelector('[data-testid="status-filter-chips"]');

      await page.locator('[data-testid="chip-status-not_contacted"]').click();
      await expect(page.locator(`[data-testid="coach-recipient-${c2.id}"]`)).not.toBeVisible();

      const resetBtn = page.locator('[data-testid="button-reset-filters"]');
      await expect(resetBtn).toBeVisible();
      await resetBtn.click();

      await expect(page.locator(`[data-testid="coach-recipient-${c1.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="coach-recipient-${c2.id}"]`)).toBeVisible();
      await expect(resetBtn).not.toBeVisible();
    } finally {
      await apiDelete(page, `/api/coaches/${c1.id}`);
      await apiDelete(page, `/api/coaches/${c2.id}`);
    }
  });
});

test.describe("Coach form — state field", () => {
  test("state input is present and saves the state value", async ({ page }) => {
    const id = uid();
    await page.goto(`${BASE}/coaches`);

    const addBtn = page.locator('[data-testid="button-add-new-coach"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await page.locator('[data-testid="input-coach-name"]').fill(`StateTest-${id}`);
    await page.locator('[data-testid="input-coach-email"]').fill(`st-${id}@t.com`);
    await page.locator('[data-testid="input-coach-school"]').fill(`School-${id}`);
    await page.locator('[data-testid="input-coach-state"]').fill("TX");

    await page.locator('[data-testid="button-save-coach"]').click();

    const coaches = await page.request.get(`${BASE}/api/coaches`);
    const list = await coaches.json();
    const created = list.find((c: { name: string; state: string }) => c.name === `StateTest-${id}`);
    expect(created).toBeDefined();
    expect(created.state).toBe("TX");

    if (created) await apiDelete(page, `/api/coaches/${created.id}`);
  });
});

test.describe("CSV import — sample file includes state column", () => {
  test("sample-coaches.csv is accessible and contains a state header", async ({ page }) => {
    const res = await page.request.get(`${BASE}/sample-coaches.csv`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text.toLowerCase()).toContain("state");
  });

  test("download sample CSV link is present in file upload tab of import dialog", async ({ page }) => {
    await page.goto(`${BASE}/coaches`);
    const importBtn = page.locator('[data-testid="button-import-coaches"]');
    await expect(importBtn).toBeVisible();
    await importBtn.click();
    await page.locator('[data-testid="tab-file"]').click();
    await expect(page.locator('[data-testid="link-download-sample-csv"]')).toBeVisible();
  });
});
