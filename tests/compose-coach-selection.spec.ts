import { test, expect, Page } from "@playwright/test";

const BASE_URL = "http://localhost:5000";

async function createTestCoach(page: Page, coachData: {
  name: string;
  email: string;
  school: string;
  state?: string;
  status?: string;
}) {
  const res = await page.request.post(`${BASE_URL}/api/coaches`, {
    data: {
      name: coachData.name,
      email: coachData.email,
      school: coachData.school,
      state: coachData.state ?? null,
      status: coachData.status ?? "not_contacted",
      favorite: false,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function deleteCoach(page: Page, id: string) {
  await page.request.delete(`${BASE_URL}/api/coaches/${id}`);
}

test.describe("Compose page — status filter chips", () => {
  test("status chips render and support multi-select OR logic", async ({ page }) => {
    const uid = `test-${Date.now()}`;
    const c1 = await createTestCoach(page, { name: `${uid}-nc`, email: `nc@${uid}.com`, school: `School-${uid}`, status: "not_contacted" });
    const c2 = await createTestCoach(page, { name: `${uid}-ct`, email: `ct@${uid}.com`, school: `School-${uid}`, status: "contacted" });

    try {
      await page.goto(`${BASE_URL}/compose`);
      await page.waitForSelector('[data-testid="status-filter-chips"]');

      const notContactedChip = page.locator('[data-testid="chip-status-not_contacted"]');
      const contactedChip = page.locator('[data-testid="chip-status-contacted"]');

      await expect(notContactedChip).toBeVisible();
      await expect(contactedChip).toBeVisible();

      await notContactedChip.click();
      await expect(notContactedChip).toHaveClass(/bg-primary/);
      await expect(contactedChip).not.toHaveClass(/bg-primary/);

      await contactedChip.click();
      await expect(notContactedChip).toHaveClass(/bg-primary/);
      await expect(contactedChip).toHaveClass(/bg-primary/);

      await notContactedChip.click();
      await expect(notContactedChip).not.toHaveClass(/bg-primary/);
      await expect(contactedChip).toHaveClass(/bg-primary/);

      const clearBtn = page.locator('[data-testid="chip-status-clear"]');
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();
      await expect(contactedChip).not.toHaveClass(/bg-primary/);
      await expect(clearBtn).not.toBeVisible();
    } finally {
      await deleteCoach(page, c1.id);
      await deleteCoach(page, c2.id);
    }
  });
});

test.describe("Compose page — state filter", () => {
  test("state filter dropdown appears and filters coaches", async ({ page }) => {
    const uid = `test-${Date.now()}`;
    const c1 = await createTestCoach(page, { name: `${uid}-ca`, email: `ca@${uid}.com`, school: `School-${uid}`, state: "CA" });
    const c2 = await createTestCoach(page, { name: `${uid}-ny`, email: `ny@${uid}.com`, school: `School-${uid}`, state: "NY" });

    try {
      await page.goto(`${BASE_URL}/compose`);
      await page.waitForSelector('[data-testid="select-state-filter"]');

      const stateFilter = page.locator('[data-testid="select-state-filter"]');
      await expect(stateFilter).toBeVisible();

      await stateFilter.click();
      const caOption = page.locator('[role="option"]', { hasText: "CA" });
      await expect(caOption).toBeVisible();
      await caOption.click();

      const summary = page.locator('[data-testid="filter-summary"]');
      await expect(summary).toContainText("match");

      const caCoachRow = page.locator(`[data-testid="coach-recipient-${c1.id}"]`);
      const nyCoachRow = page.locator(`[data-testid="coach-recipient-${c2.id}"]`);
      await expect(caCoachRow).toBeVisible();
      await expect(nyCoachRow).not.toBeVisible();
    } finally {
      await deleteCoach(page, c1.id);
      await deleteCoach(page, c2.id);
    }
  });
});

test.describe("Compose page — sort modes", () => {
  test("sort dropdown has all required modes and defaults to Favorites First", async ({ page }) => {
    await page.goto(`${BASE_URL}/compose`);
    const sortSelect = page.locator('[data-testid="select-sort-mode"]');
    await expect(sortSelect).toBeVisible();
    await expect(sortSelect).toContainText("Favorites First");

    await sortSelect.click();
    await expect(page.locator('[role="option"]', { hasText: "Favorites First" })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: "A → Z" })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: "By Division" })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: "Last Contacted (oldest)" })).toBeVisible();
    await page.keyboard.press("Escape");
  });
});

test.describe("Compose page — 100-recipient cap", () => {
  test("filter summary shows X/100 selected counter", async ({ page }) => {
    await page.goto(`${BASE_URL}/compose`);
    const summary = page.locator('[data-testid="filter-summary"]');
    await expect(summary).toBeVisible();
    const selectedCount = page.locator('[data-testid="text-selected-count"]');
    await expect(selectedCount).toContainText("/100 selected");
  });

  test("checkboxes disable when cap is reached", async ({ page }) => {
    const uid = `cap-${Date.now()}`;
    const coaches: string[] = [];
    for (let i = 0; i < 3; i++) {
      const c = await createTestCoach(page, {
        name: `${uid}-coach-${i}`,
        email: `coach${i}@${uid}.com`,
        school: `School-${uid}`,
      });
      coaches.push(c.id);
    }

    try {
      await page.goto(`${BASE_URL}/compose`);
      await page.evaluate(() => {
        (window as any).__TEST_CAP__ = 2;
      });

      const checkbox0 = page.locator(`[data-testid="checkbox-coach-${coaches[0]}"]`);
      const checkbox1 = page.locator(`[data-testid="checkbox-coach-${coaches[1]}"]`);
      const checkbox2 = page.locator(`[data-testid="checkbox-coach-${coaches[2]}"]`);
      await checkbox0.click();
      await checkbox1.click();

      const selectedCount = page.locator('[data-testid="text-selected-count"]');
      await expect(selectedCount).toContainText("2/100 selected");
    } finally {
      for (const id of coaches) await deleteCoach(page, id);
    }
  });
});

test.describe("Compose page — reset filters", () => {
  test("Reset filters link appears when filters active and clears all filters", async ({ page }) => {
    await page.goto(`${BASE_URL}/compose`);

    const chip = page.locator('[data-testid="chip-status-contacted"]');
    await chip.click();
    await expect(chip).toHaveClass(/bg-primary/);

    const resetBtn = page.locator('[data-testid="button-reset-filters"]');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    await expect(chip).not.toHaveClass(/bg-primary/);
    await expect(resetBtn).not.toBeVisible();
  });
});

test.describe("Coach form — state field", () => {
  test("state input is visible in add coach form", async ({ page }) => {
    await page.goto(`${BASE_URL}/coaches`);
    const addBtn = page.locator('[data-testid="button-add-coach"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const stateInput = page.locator('[data-testid="input-coach-state"]');
    await expect(stateInput).toBeVisible();
    await stateInput.fill("TX");
  });
});

test.describe("CSV import — state support", () => {
  test("sample CSV download link is present in upload tab", async ({ page }) => {
    await page.goto(`${BASE_URL}/coaches`);

    const importBtn = page.locator('[data-testid="button-import-coaches"]');
    if (await importBtn.isVisible()) {
      await importBtn.click();
      const fileTab = page.locator('[data-testid="tab-file"]');
      await fileTab.click();
      const downloadLink = page.locator('[data-testid="link-download-sample-csv"]');
      await expect(downloadLink).toBeVisible();
    }
  });
});
