import { chromium } from "@playwright/test";

const FRONTEND_URL = "http://localhost:8080";
const API_URL = "http://localhost:3000/api";
const HOSPITAL_ID = "e28659d2-030a-48c3-a421-25e836dcfeb2";
const HOSPITAL_NAME = "Hospital Debug 1773687959580";

const USER = {
  identifier: "100001",
  password: "12345678",
  role: "general_manager",
};

const jsonFetch = async (url, init = {}) => {
  const response = await fetch(url, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: response.ok, status: response.status, body };
};

const authHeaders = (token) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensurePageReady = async (page, ms = 1200) => {
  await page.waitForLoadState("domcontentloaded");
  await sleep(ms);
};

const loginViaUi = async (page) => {
  await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
  await ensurePageReady(page);

  await page.getByRole("combobox").nth(0).click();
  await page.getByRole("option", { name: HOSPITAL_NAME }).click();
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: /gestor geral/i }).click();
  await page.locator("#identifier").fill(USER.identifier);
  await page.locator("#password").fill(USER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  await ensurePageReady(page, 1800);
};

const createFixtures = async (token, suffix) => {
  const formula = await jsonFetch(`${API_URL}/formulas`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      hospitalId: HOSPITAL_ID,
      code: `DELFORM-${suffix}`,
      name: `Formula Delete UI ${suffix}`,
      manufacturer: "QA",
      type: "standard",
      systemType: "both",
      presentationForm: "liquido",
      presentations: [200],
      billingUnit: "ml",
      billingPrice: 0.11,
      density: 1.2,
      caloriesPerUnit: 120,
      proteinPerUnit: 6,
      isActive: true,
    }),
  });
  const moduleItem = await jsonFetch(`${API_URL}/modules`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      hospitalId: HOSPITAL_ID,
      code: `DELMOD-${suffix}`,
      name: `Modulo Delete UI ${suffix}`,
      manufacturer: "QA",
      description: "QA delete module",
      presentationForm: "po",
      presentations: [100],
      density: 1,
      referenceAmount: 1,
      referenceTimesPerDay: 1,
      calories: 10,
      protein: 5,
      sodium: 0,
      potassium: 0,
      fiber: 0,
      freeWater: 0,
      billingUnit: "g",
      billingPrice: 0.05,
      isActive: true,
    }),
  });
  const supply = await jsonFetch(`${API_URL}/supplies`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      hospitalId: HOSPITAL_ID,
      code: `DELSUP-${suffix}`,
      name: `Insumo Delete UI ${suffix}`,
      type: "other",
      category: "other",
      billingUnit: "unit",
      unitPrice: 1.23,
      isBillable: true,
      isActive: true,
    }),
  });
  const professional = await jsonFetch(`${API_URL}/professionals`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      hospitalId: HOSPITAL_ID,
      name: `Profissional Delete UI ${suffix}`,
      role: "technician",
      registrationNumber: `88${suffix}`.slice(0, 8),
      isActive: true,
    }),
  });
  const ward = await jsonFetch(`${API_URL}/wards`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      hospitalId: HOSPITAL_ID,
      name: `Ala Delete UI ${suffix}`,
      type: "enfermaria",
      isActive: true,
    }),
  });

  return {
    formula: formula.body,
    module: moduleItem.body,
    supply: supply.body,
    professional: professional.body,
    ward: ward.body,
  };
};

const deleteFromTableByText = async (page, rowText) => {
  const row = page.locator("tr").filter({ hasText: rowText }).last();
  await row.waitFor({ state: "visible", timeout: 15000 });
  await row.scrollIntoViewIfNeeded();
  const buttons = row.locator("button");
  const count = await buttons.count();
  page.once("dialog", (dialog) => dialog.accept());
  await buttons.nth(count - 1).click({ force: true });
  try {
    await expectGone(page, rowText);
  } catch {
    await sleep(1200);
  }
};

const expectGone = async (page, text) => {
  await page.waitForFunction(
    (value) => !document.body.innerText.includes(value),
    text,
    { timeout: 15000 },
  );
};

const waitForInactiveByApi = async (token, path, id) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await jsonFetch(`${API_URL}${path}`, {
      headers: authHeaders(token),
    });
    if (!response.ok || !Array.isArray(response.body)) {
      throw new Error(`Falha ao validar remocao em ${path}: ${response.status}`);
    }
    const found = response.body.find((item) => item.id === id);
    if (!found) {
      return;
    }
    await sleep(1000);
  }
  throw new Error(`Item ${id} ainda apareceu ativo em ${path}`);
};

const openSyncCenterAndRead = async (page) => {
  await page.getByRole("button", { name: /central sync/i }).click();
  await page.getByRole("button", { name: /sincronizar agora/i }).click();
  await sleep(2500);

  const dialog = page.locator("[role='dialog']").filter({ hasText: "Central de sincronizacao" }).last();
  const text = await dialog.innerText();
  return text;
};

const run = async () => {
  const login = await jsonFetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ hospitalId: HOSPITAL_ID, ...USER }),
  });

  if (!login.ok) {
    throw new Error(`Login API falhou: ${login.status} ${JSON.stringify(login.body)}`);
  }

  const token = login.body.session.access_token;
  const suffix = Date.now();
  const fixtures = await createFixtures(token, suffix);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const report = {
    deleted: {},
    failedResponses: [],
    requestFailures: [],
    pageErrors: [],
    syncText: "",
  };

  page.on("requestfailed", (request) => {
    report.requestFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || "unknown",
    });
  });
  page.on("pageerror", (error) => {
    report.pageErrors.push(error.message);
  });
  page.on("response", async (response) => {
    const url = response.url();
    if (!url.startsWith(FRONTEND_URL) && !url.startsWith("http://localhost:3000")) return;
    if (response.status() >= 400 && !url.includes(".map")) {
      report.failedResponses.push({ url, status: response.status() });
    }
  });

  await loginViaUi(page);

  await page.goto(`${FRONTEND_URL}/formulas`, { waitUntil: "domcontentloaded" });
  await ensurePageReady(page, 1800);
  await deleteFromTableByText(page, fixtures.formula.code);
  await waitForInactiveByApi(token, "/formulas", fixtures.formula.id);
  report.deleted.formula = fixtures.formula.code;
  await page.getByRole("tab", { name: /modulos/i }).click();
  await ensurePageReady(page, 800);
  await deleteFromTableByText(page, fixtures.module.code || fixtures.module.name);
  await waitForInactiveByApi(token, "/modules", fixtures.module.id);
  report.deleted.module = fixtures.module.name;

  await page.goto(`${FRONTEND_URL}/supplies`, { waitUntil: "domcontentloaded" });
  await ensurePageReady(page, 1500);
  await deleteFromTableByText(page, fixtures.supply.code);
  await waitForInactiveByApi(token, "/supplies", fixtures.supply.id);
  report.deleted.supply = fixtures.supply.code;

  await page.goto(`${FRONTEND_URL}/professionals`, { waitUntil: "domcontentloaded" });
  await ensurePageReady(page, 1500);
  await deleteFromTableByText(page, fixtures.professional.name);
  await waitForInactiveByApi(token, "/professionals", fixtures.professional.id);
  report.deleted.professional = fixtures.professional.name;

  await page.goto(`${FRONTEND_URL}/settings`, { waitUntil: "domcontentloaded" });
  await ensurePageReady(page, 1800);
  page.once("dialog", (dialog) => dialog.accept());
  const wardBadge = page.locator("div").filter({ hasText: fixtures.ward.name }).last();
  await wardBadge.scrollIntoViewIfNeeded();
  await wardBadge.locator("button").last().click({ force: true });
  await expectGone(page, fixtures.ward.name);
  await waitForInactiveByApi(token, "/wards", fixtures.ward.id);
  report.deleted.ward = fixtures.ward.name;

  report.syncText = await openSyncCenterAndRead(page);

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
