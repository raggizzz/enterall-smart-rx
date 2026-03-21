import { chromium } from "@playwright/test";

const FRONTEND_URL = "http://localhost:8080";
const API_URL = "http://localhost:3000/api";
const HOSPITAL_ID = "e28659d2-030a-48c3-a421-25e836dcfeb2";
const HOSPITAL_NAME = "Hospital Debug 1773687959580";

const USERS = {
  generalManager: {
    identifier: "100001",
    password: "12345678",
    role: "general_manager",
  },
  nutritionist: {
    identifier: "100003",
    password: "12345678",
    role: "nutritionist",
  },
  technician: {
    identifier: "100004",
    password: "12345678",
    role: "technician",
  },
};

const ROUTES = [
  "/dashboard",
  "/patients",
  "/prescription-new",
  "/formulas",
  "/reports",
  "/tools",
  "/professionals",
  "/supplies",
  "/billing",
  "/labels",
  "/oral-map",
  "/oral-therapy",
  "/parenteral-therapy",
  "/patient-monitoring",
  "/settings",
];

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

const loginByApi = async (user) => {
  const response = await jsonFetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      hospitalId: HOSPITAL_ID,
      identifier: user.identifier,
      password: user.password,
      role: user.role,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${user.role}: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return response.body;
};

const authHeaders = (token) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});

const makeQaFormulaPayload = (suffix) => ({
  code: `QAMIX-${suffix}`,
  name: `Formula QA Mista ${suffix}`,
  manufacturer: "QA",
  type: "standard",
  systemType: "both",
  formulaTypes: ["open", "supplement"],
  administrationRoutes: ["enteral", "oral"],
  presentationForm: "liquido",
  presentations: [200],
  billingUnit: "ml",
  billingPrice: 0.11,
  density: 1.5,
  caloriesPerUnit: 150,
  proteinPerUnit: 9,
  proteinPct: 24,
  carbPct: 46,
  fatPct: 30,
  classification: "formula mista QA",
  isActive: true,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureBodyReady = async (page) => {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => !document.body.innerText.includes("Carregando Interface Clinica"), null, {
    timeout: 10000,
  }).catch(() => {});
  await sleep(1200);
};

const run = async () => {
  const report = {
    api: {
      logins: {},
      endpoints: [],
      qaFormula: null,
    },
    ui: {
      login: null,
      qaFormulaVisible: null,
      routes: [],
      consoleErrors: [],
      pageErrors: [],
      failedResponses: [],
      requestFailures: [],
    },
  };

  const gmSession = await loginByApi(USERS.generalManager);
  const nutritionistSession = await loginByApi(USERS.nutritionist);
  const technicianSession = await loginByApi(USERS.technician);

  report.api.logins = {
    generalManager: gmSession.user.name,
    nutritionist: nutritionistSession.user.name,
    technician: technicianSession.user.name,
  };

  const token = gmSession.session.access_token;
  const endpointList = [
    "/hospitals",
    "/patients",
    "/prescriptions",
    "/formulas",
    "/modules",
    "/supplies",
    "/professionals",
    "/wards",
    "/clinics",
    "/settings",
    "/evolutions",
    "/role-permissions",
    "/app-tools",
  ];

  for (const path of endpointList) {
    const response = await jsonFetch(`${API_URL}${path}`, {
      headers: authHeaders(token),
    });
    report.api.endpoints.push({
      path,
      status: response.status,
      ok: response.ok,
      count: Array.isArray(response.body) ? response.body.length : undefined,
    });
  }

  const suffix = Date.now();
  const createFormulaResponse = await jsonFetch(`${API_URL}/formulas`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(makeQaFormulaPayload(suffix)),
  });

  if (!createFormulaResponse.ok) {
    throw new Error(`Failed to create mixed QA formula: ${createFormulaResponse.status} ${JSON.stringify(createFormulaResponse.body)}`);
  }

  const formulasResponse = await jsonFetch(`${API_URL}/formulas`, {
    headers: authHeaders(token),
  });
  const qaFormula = Array.isArray(formulasResponse.body)
    ? formulasResponse.body.find((item) => item.code === `QAMIX-${suffix}`)
    : null;

  report.api.qaFormula = qaFormula
    ? {
      id: qaFormula.id,
      code: qaFormula.code,
      type: qaFormula.type,
      systemType: qaFormula.systemType,
      formulaTypes: qaFormula.formulaTypes,
      administrationRoutes: qaFormula.administrationRoutes,
    }
    : null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.ui.consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    report.ui.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    report.ui.requestFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || "unknown",
    });
  });
  page.on("response", async (response) => {
    const url = response.url();
    if (!url.startsWith(FRONTEND_URL) && !url.startsWith(API_URL.replace("/api", ""))) return;
    if (response.status() < 400) return;
    if (url.includes(".map")) return;
    report.ui.failedResponses.push({
      url,
      status: response.status(),
    });
  });

  await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
  await ensureBodyReady(page);

  const selects = page.locator("select");
  await selects.nth(0).selectOption(HOSPITAL_ID);
  await selects.nth(1).selectOption("general_manager");
  await page.locator("#identifier").fill(USERS.generalManager.identifier);
  await page.locator("#password").fill(USERS.generalManager.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await ensureBodyReady(page);

  report.ui.login = {
    path: new URL(page.url()).pathname,
    bodySnippet: (await page.locator("body").innerText()).slice(0, 180),
  };

  for (const route of ROUTES) {
    await page.goto(`${FRONTEND_URL}${route}`, { waitUntil: "domcontentloaded" });
    await ensureBodyReady(page);

    const bodyText = await page.locator("body").innerText();
    report.ui.routes.push({
      route,
      finalPath: new URL(page.url()).pathname,
      title: await page.title(),
      hasForbidden: bodyText.includes("Acesso negado"),
      hasNotFound: bodyText.includes("Pagina nao encontrada") || bodyText.includes("Página não encontrada"),
      bodySnippet: bodyText.slice(0, 220),
    });
  }

  if (report.api.qaFormula?.code) {
    await page.goto(`${FRONTEND_URL}/formulas`, { waitUntil: "domcontentloaded" });
    await ensureBodyReady(page);
    await page.getByPlaceholder("Buscar por nome, codigo, fabricante...").fill(report.api.qaFormula.code);
    await sleep(800);
    const formulasBody = await page.locator("body").innerText();
    report.ui.qaFormulaVisible = {
      code: report.api.qaFormula.code,
      visible: formulasBody.includes(report.api.qaFormula.code) && formulasBody.includes("enteral") && formulasBody.includes("oral"),
      bodySnippet: formulasBody.slice(0, 400),
    };
  }

  await browser.close();

  console.log(JSON.stringify(report, null, 2));
};

run().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
