import { chromium } from "@playwright/test";

const FRONTEND_URL = "http://localhost:8080";
const API_URL = "http://localhost:3000/api";
const HOSPITAL_ID = "e28659d2-030a-48c3-a421-25e836dcfeb2";

const USER = {
  identifier: "100001",
  password: "12345678",
  role: "general_manager",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const loginByApi = async () => {
  const response = await jsonFetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      hospitalId: HOSPITAL_ID,
      identifier: USER.identifier,
      password: USER.password,
      role: USER.role,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return response.body;
};

const authHeaders = (token) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});

const ensureBodyReady = async (page) => {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => !document.body.innerText.includes("Carregando Interface Clinica"), null, {
    timeout: 10000,
  }).catch(() => {});
  await sleep(1200);
};

const normalizeText = (value) =>
  (value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const clickVisibleElementByText = async (page, text) => {
  const clicked = await page.evaluate((targetText) => {
    const normalize = (value) =>
      (value || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden"
        && style.display !== "none"
        && rect.width > 0
        && rect.height > 0;
    };

    const target = normalize(targetText);
    const candidates = [...document.querySelectorAll("button, [role='button'], [role='option'], div, article, p, span, label")]
      .filter((element) => isVisible(element) && normalize(element.textContent || "").includes(target))
      .sort((left, right) => {
        const leftButtonScore = left.matches("button, [role='button'], [role='option']") ? 0 : 1;
        const rightButtonScore = right.matches("button, [role='button'], [role='option']") ? 0 : 1;
        if (leftButtonScore !== rightButtonScore) return leftButtonScore - rightButtonScore;
        return (left.textContent || "").length - (right.textContent || "").length;
      });

    const clickable = candidates.find((element) => {
      let current = element;
      while (current) {
        if (current instanceof HTMLElement) {
          const style = window.getComputedStyle(current);
          if (
            current.matches("button, [role='button'], [role='option'], [data-radix-collection-item]")
            || current.onclick
            || style.cursor === "pointer"
          ) {
            current.click();
            return true;
          }
        }
        current = current.parentElement;
      }
      return false;
    });

    return Boolean(clickable);
  }, text);

  assert(clicked, `Nao foi possivel clicar no elemento com texto: ${text}`);
  await ensureBodyReady(page);
};

const clickCardByText = async (page, text) => {
  const cards = page.locator("[class*='cursor-pointer']").filter({ hasText: text });
  const count = await cards.count();
  assert(count > 0, `Nenhum card clicavel encontrado com o texto: ${text}`);
  await cards.first().click();
  await ensureBodyReady(page);
};

const clickStepButton = async (page, label) => {
  const normalizedLabel = normalizeText(label);
  const candidates = page.locator("button");
  const count = await candidates.count();

  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    if (!(await candidate.isEnabled().catch(() => false))) continue;
    const text = normalizeText(await candidate.innerText().catch(() => ""));
    if (text.includes(normalizedLabel)) {
      await candidate.click();
      await ensureBodyReady(page);
      return;
    }
  }

  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    if (!(await candidate.isEnabled().catch(() => false))) continue;
    const text = normalizeText(await candidate.innerText().catch(() => ""));
    if (normalizedLabel.includes("proximo") && text.startsWith("pr")) {
      await candidate.click();
      await ensureBodyReady(page);
      return;
    }
    if (normalizedLabel.includes("voltar") && text.startsWith("vo")) {
      await candidate.click();
      await ensureBodyReady(page);
      return;
    }
  }

  throw new Error(`Botao de etapa nao encontrado: ${label}`);
};

const extractVisiblePatientNames = async (page) => {
  return page.evaluate(() => {
    const bodyText = document.body.innerText || "";
    return bodyText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 3);
  });
};

const run = async () => {
  const report = {
    context: {},
    wizard: {},
    printPages: {},
  };

  const session = await loginByApi();
  const token = session.session.access_token;

  const [patientsResponse, prescriptionsResponse, formulasResponse] = await Promise.all([
    jsonFetch(`${API_URL}/patients`, { headers: authHeaders(token) }),
    jsonFetch(`${API_URL}/prescriptions`, { headers: authHeaders(token) }),
    jsonFetch(`${API_URL}/formulas`, { headers: authHeaders(token) }),
  ]);

  assert(patientsResponse.ok, "Falha ao carregar pacientes via API.");
  assert(prescriptionsResponse.ok, "Falha ao carregar prescricoes via API.");
  assert(formulasResponse.ok, "Falha ao carregar formulas via API.");

  const patients = patientsResponse.body;
  const prescriptions = prescriptionsResponse.body;
  const formulas = formulasResponse.body;
  const patientNames = patients.map((patient) => patient.name).filter(Boolean);

  const activePatient = patients.find((patient) => patient.status === "active");
  assert(activePatient, "Nenhum paciente ativo encontrado para o QA.");

  const qaSuffix = Date.now();
  const qaPatientPayload = {
    name: `QA Prescricao Adulto ${qaSuffix}`,
    record: `QA${qaSuffix}`,
    dob: "1990-01-01",
    gender: "male",
    weight: 70,
    height: 175,
    bed: `QA-${String(qaSuffix).slice(-2)}`,
    ward: activePatient.ward || "Ala QA",
    status: "active",
    nutritionType: "enteral",
    observation: "Paciente temporario criado pelo QA automatizado",
    consistency: "Livre",
    mealCount: 6,
  };

  const createQaPatientResponse = await jsonFetch(`${API_URL}/patients`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(qaPatientPayload),
  });
  assert(createQaPatientResponse.ok, `Falha ao criar paciente temporario do QA: ${createQaPatientResponse.status}`);

  const oralPatientIds = new Set(
    prescriptions
      .filter((prescription) => prescription.status === "active" && prescription.therapyType === "oral")
      .map((prescription) => prescription.patientId),
    );
  const printPatient = patients.find((patient) => oralPatientIds.has(patient.id)) || activePatient;

  const mixedFormula = [...formulas]
    .reverse()
    .find((formula) =>
      (formula.formulaTypes || []).includes("open")
      && (formula.formulaTypes || []).includes("supplement")
      && (formula.administrationRoutes || []).includes("enteral")
      && (formula.administrationRoutes || []).includes("oral"),
    );
  assert(mixedFormula, "Nenhuma formula mista (aberta + suplemento oral) encontrada para o QA.");

  report.context = {
    patient: {
      id: createQaPatientResponse.body.id,
      name: qaPatientPayload.name,
      ward: qaPatientPayload.ward,
      bed: qaPatientPayload.bed,
    },
    printPatient: {
      id: printPatient.id,
      name: printPatient.name,
      ward: printPatient.ward,
      bed: printPatient.bed,
    },
    mixedFormula: {
      id: mixedFormula.id,
      code: mixedFormula.code,
      name: mixedFormula.name,
      formulaTypes: mixedFormula.formulaTypes,
      administrationRoutes: mixedFormula.administrationRoutes,
      systemType: mixedFormula.systemType,
    },
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const failedResponses = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    const url = response.url();
    if (!url.startsWith(FRONTEND_URL) && !url.startsWith("http://localhost:3000")) return;
    if (response.status() < 400 || url.includes(".map")) return;
    failedResponses.push({ url, status: response.status() });
  });

  await page.addInitScript(() => {
    window.__printCalls = 0;
    window.print = () => {
      window.__printCalls += 1;
    };
  });

  await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
  await ensureBodyReady(page);

  const selects = page.locator("select");
  await selects.nth(0).selectOption(HOSPITAL_ID);
  await selects.nth(1).selectOption(USER.role);
  await page.locator("#identifier").fill(USER.identifier);
  await page.locator("#password").fill(USER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await ensureBodyReady(page);

  await page.goto(`${FRONTEND_URL}/prescription-new`, { waitUntil: "domcontentloaded" });
  await ensureBodyReady(page);

  await clickCardByText(page, qaPatientPayload.name);
  await clickStepButton(page, "Proximo");
  await clickCardByText(page, "Oral");
  await clickCardByText(page, "Enteral");
  await clickStepButton(page, "Proximo");
  await clickCardByText(page, "Sonda Nasoenteral (SNE)");
  await clickStepButton(page, "Proximo");
  await clickCardByText(page, "Sistema Aberto");
  await clickStepButton(page, "Proximo");

  const openStepText = await page.locator("body").innerText();
  const wizardHasOralAndEnteral = normalizeText(openStepText).includes("vias: oral enteral");

  const openFormulaCombobox = page.getByRole("combobox").first();
  await openFormulaCombobox.click();
  await page.waitForSelector('[role="option"]', { timeout: 10000 });
  const openFormulaOptions = await page.locator('[role="option"]').allInnerTexts();
  const openFormulaFound = openFormulaOptions.some((option) => normalizeText(option).includes(normalizeText(mixedFormula.name)));
  assert(openFormulaFound, `A formula mista ${mixedFormula.name} nao apareceu no seletor do sistema aberto.`);
  await page.getByRole("option", { name: new RegExp(mixedFormula.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).click();

  await clickCardByText(page, "Bomba");
  const infusionModeText = await page.locator("body").innerText();
  const hasOpenDurationField = normalizeText(infusionModeText).includes("infundir cada etapa em");
  const hasEquipmentVolumeField = normalizeText(infusionModeText).includes("volume por equipo");
  await clickStepButton(page, "Proximo");
  await clickStepButton(page, "Proximo");
  await clickStepButton(page, "Proximo");

  const oralStepText = await page.locator("body").innerText();
  const hasInfantOnlyControlsHidden = !normalizeText(oralStepText).includes("via de administracao");

  const therapyQuestion = page.getByText("Terapia nutricional via oral?", { exact: false });
  const therapyContainer = therapyQuestion.locator("xpath=..");
  await therapyContainer.locator('[role="checkbox"]').nth(1).click();
  await ensureBodyReady(page);

  await page.getByRole("button", { name: /Adicionar \(0\/3\)/ }).first().click();
  await ensureBodyReady(page);

  const oralSupplementCombobox = page.getByRole("combobox").first();
  await oralSupplementCombobox.click();
  await page.waitForSelector('[role="option"]', { timeout: 10000 });
  const oralOptions = await page.locator('[role="option"]').allInnerTexts();
  const oralFormulaFound = oralOptions.some((option) => normalizeText(option).includes(normalizeText(mixedFormula.name)));
  assert(oralFormulaFound, `A formula mista ${mixedFormula.name} nao apareceu no seletor de suplementos via oral.`);
  await page.keyboard.press("Escape");

  report.wizard = {
    hydratedWizardHasOralAndEnteral: wizardHasOralAndEnteral,
    hasOpenDurationField,
    hasEquipmentVolumeField,
    openFormulaFound,
    oralFormulaFound,
    infantOnlyControlsHiddenOnAdultOralStep: hasInfantOnlyControlsHidden,
  };

  await page.goto(`${FRONTEND_URL}/billing`, { waitUntil: "domcontentloaded" });
  await ensureBodyReady(page);
  const billingVisibleText = await page.locator("body").innerText();
  const billingVisibleHasPatient = normalizeText(billingVisibleText).includes(normalizeText(printPatient.name));
  await page.getByRole("button", { name: /Gerar PDF/i }).click();
  await ensureBodyReady(page);
  await sleep(500);
  const billingPrintText = await page.evaluate(() => document.body.textContent || "");
  const billingPrintHasMap = normalizeText(billingPrintText).includes("mapa da dieta por paciente");
  const billingPrintHasPatient = normalizeText(billingPrintText).includes(normalizeText(printPatient.name));
  const printCallsIntercepted = await page.evaluate(() => window.__printCalls || 0);

  await page.goto(`${FRONTEND_URL}/labels`, { waitUntil: "domcontentloaded" });
  await ensureBodyReady(page);
  const labelsText = await page.locator("body").innerText();
  const labelsHasPatient = patientNames.some((name) => normalizeText(labelsText).includes(normalizeText(name)));
  const labelsHasNoEmptyState = !normalizeText(labelsText).includes("nenhuma etiqueta encontrada");

  await page.goto(`${FRONTEND_URL}/oral-map`, { waitUntil: "domcontentloaded" });
  await ensureBodyReady(page);
  const oralMapText = await page.locator("body").innerText();
  const oralMapHasPatient = normalizeText(oralMapText).includes(normalizeText(printPatient.name));
  const oralMapHasNoEmptyState = !normalizeText(oralMapText).includes("nenhum paciente com dieta oral ou suplementos");

  await page.goto(`${FRONTEND_URL}/reports`, { waitUntil: "domcontentloaded" });
  await ensureBodyReady(page);
  const reportsText = await page.locator("body").innerText();
  const reportsHasMetrics = normalizeText(reportsText).includes("prescricoes no periodo")
    && normalizeText(reportsText).includes("custo medio por paciente/dia")
    && normalizeText(reportsText).includes("media diaria do custo da ala");

  report.printPages = {
    billing: {
      visibleHasPatient: billingVisibleHasPatient,
      printHasMap: billingPrintHasMap,
      printHasPatient: billingPrintHasPatient,
    },
    labels: {
      hasPatient: labelsHasPatient,
      hasNoEmptyState: labelsHasNoEmptyState,
    },
    oralMap: {
      hasPatient: oralMapHasPatient,
      hasNoEmptyState: oralMapHasNoEmptyState,
    },
    reports: {
      hasMetrics: reportsHasMetrics,
    },
    printCallsIntercepted,
  };

  report.consoleErrors = consoleErrors;
  report.pageErrors = pageErrors;
  report.failedResponses = failedResponses;

  await browser.close();

  console.log(JSON.stringify(report, null, 2));
};

run().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
