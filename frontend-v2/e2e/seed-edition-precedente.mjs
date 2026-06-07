// =============================================================================
// Seed « Édition précédente » — scénario auto-contenu et contrôlé.
//
// Crée :
//   • Emma (employee) + Marc (manager, manager d'Emma)
//   • F_SOURCE (annuel 2025) → C2025 → éval validée d'Emma avec réponses
//   • F_CURRENT = clone de F_SOURCE (lignée parentQuestionId), carryPrevious
//       activé sur 3 questions / 4 → C2026 (previousCampaignId=C2025)
//   • Évals 2026 : self (Emma) + manager (Marc→Emma)
//   • Contre-exemple : F_HUMEUR (carryPrevious=false partout) → C_HUMEUR
//
// Écrit e2e/.edition-demo.json avec tous les ids + creds pour les captures.
// =============================================================================
import { request } from "@playwright/test";
import fs from "fs";

const BASE = "https://localhost";
const ctx = await request.newContext({ baseURL: BASE, ignoreHTTPSErrors: true, timeout: 30000 });
const ts = Date.now();

const pick = (o, ...k) => { for (const x of k) if (o && o[x] != null) return o[x]; return undefined; };
const idOf = (o) => pick(o, "_id", "id") ?? pick(o?.data, "_id", "id") ?? pick(o?.form, "_id", "id") ?? pick(o?.data?.form, "_id", "id");

async function post(path, data) { const r = await ctx.post(path, { data }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } if (!r.ok()) console.log(`  ✗ POST ${path} → ${r.status()} ${t.slice(0, 160)}`); return j; }
async function patch(path, data) { const r = await ctx.patch(path, { data }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } if (!r.ok()) console.log(`  ✗ PATCH ${path} → ${r.status()} ${t.slice(0, 160)}`); return j; }
async function get(path) { const r = await ctx.get(path); const t = await r.text(); try { return JSON.parse(t); } catch { return t; } }

// ── 0. Login admin ──────────────────────────────────────────────────────────
console.log("admin:", (await ctx.post("/api/auth/login", { data: { email: "alice@nxrh.local", password: "password123" } })).status());

// ── 1. Utilisateurs ──────────────────────────────────────────────────────────
const empRes = await post("/api/users", { firstName: "Emma", lastName: "Employé", email: `emma.${ts}@nxrh.local`, role: "employee" });
const emma = idOf(empRes); const emmaPwd = pick(empRes, "tempPassword") ?? pick(empRes?.data, "tempPassword");
const mgrRes = await post("/api/users", { firstName: "Marc", lastName: "Manager", email: `marc.${ts}@nxrh.local`, role: "manager" });
const marc = idOf(mgrRes); const marcPwd = pick(mgrRes, "tempPassword") ?? pick(mgrRes?.data, "tempPassword");
await patch(`/api/users/${emma}`, { managerId: marc });
console.log("Emma:", emma, "| Marc:", marc);

// ── 2. Form source (annuel 2025) ──────────────────────────────────────────────
const Q = (id, type, text, extra = {}) => ({ id, type, text, required: false, phase: "all", ...extra });
const sourceQuestions = [
  Q("q-tech", "rating", "Comment évaluez-vous votre maîtrise technique ?"),
  Q("q-forts", "text", "Quels ont été vos points forts cette année ?"),
  Q("q-auto", "rating", "Votre niveau d'autonomie sur vos missions ?"),
  Q("q-axe", "text", "Un axe d'amélioration pour l'an prochain ?"),
];
const fSource = idOf(await post("/api/forms", { title: `Entretien annuel 2025 (source ${ts})`, formType: "self_evaluation", questions: sourceQuestions, filledBy: "employee" }));
console.log("F_SOURCE:", fSource);

// ── 3. Campagne 2025 + éval validée d'Emma ────────────────────────────────────
const c2025 = idOf(await post("/api/campaigns", { name: `Campagne annuelle 2025 (${ts})`, startDate: "2025-01-06", endDate: "2025-03-31", formId: fSource, enableN1Context: false }));
await patch(`/api/campaigns/${c2025}`, { status: "active" });
const e25 = idOf(await post("/api/evaluations", { campaignId: c2025, formId: fSource, evaluatorId: emma, evaluateeId: emma }));
console.log("C2025:", c2025, "| E25:", e25);
await patch(`/api/evaluations/${e25}`, { answers: [
  { questionId: "q-tech", value: 4 },
  { questionId: "q-forts", value: "Pilotage du projet X de bout en bout, et montée en compétence sur l'outil Y." },
  { questionId: "q-auto", value: 5 },
  { questionId: "q-axe", value: "Déléguer davantage les tâches récurrentes." },
] });
await patch(`/api/evaluations/${e25}`, { status: "submitted" });
await patch(`/api/evaluations/${e25}`, { status: "reviewed", reviewerScore: 78, reviewerComment: "Année solide, très bonne autonomie. À consolider : la délégation.", nextYearObjectives: "Prendre le lead sur un second projet." });
console.log("E25 → reviewed (édition précédente prête)");

// ── 4. Form courant = clone (lignée) + curation carryPrevious sur 3/4 ──────────
const cloneRes = await post(`/api/forms/${fSource}/clone`, {});
const fCurrent = idOf(cloneRes);
const fCurrentDoc = await get(`/api/forms/${fCurrent}`);
const curQs = (pick(fCurrentDoc, "questions") ?? pick(fCurrentDoc?.data, "questions") ?? []).map((q, i) => ({
  ...q,
  carryPrevious: i < 3, // q-tech, q-forts, q-auto repris ; q-axe NON (contraste)
}));
await patch(`/api/forms/${fCurrent}`, { title: `Entretien annuel 2026 (${ts})`, questions: curQs });
console.log("F_CURRENT:", fCurrent, "| carryPrevious sur", curQs.filter((q) => q.carryPrevious).length, "/", curQs.length);

// ── 5. Campagne 2026 (previousCampaignId=C2025) + évals self & manager ─────────
const c2026 = idOf(await post("/api/campaigns", { name: `Campagne annuelle 2026 (${ts})`, startDate: "2026-06-01", endDate: "2026-12-31", formId: fCurrent }));
await patch(`/api/campaigns/${c2026}`, { status: "active", enableN1Context: true, n1VisibleToEmployee: true, previousCampaignId: c2025 });
const e26self = idOf(await post("/api/evaluations", { campaignId: c2026, formId: fCurrent, evaluatorId: emma, evaluateeId: emma }));
const e26mgr = idOf(await post("/api/evaluations", { campaignId: c2026, formId: fCurrent, evaluatorId: marc, evaluateeId: emma }));
console.log("C2026:", c2026, "| E26_self:", e26self, "| E26_mgr:", e26mgr);

// ── 6. Contre-exemple : campagne courte « Humeur » (aucun carryPrevious) ───────
const fHumeur = idOf(await post("/api/forms", { title: `Humeur trimestrielle (${ts})`, formType: "self_evaluation", filledBy: "employee", questions: [
  Q("h-meteo", "weather", "Quelle est votre météo du trimestre ?"),
  Q("h-comm", "text", "Un mot sur l'ambiance d'équipe ?"),
] }));
const cHumeur = idOf(await post("/api/campaigns", { name: `Humeur trimestrielle 2026 (${ts})`, startDate: "2026-06-01", endDate: "2026-12-31", formId: fHumeur }));
await patch(`/api/campaigns/${cHumeur}`, { status: "active", enableN1Context: true, n1VisibleToEmployee: true, previousCampaignId: c2025 });
const eHumeur = idOf(await post("/api/evaluations", { campaignId: cHumeur, formId: fHumeur, evaluatorId: emma, evaluateeId: emma }));
console.log("C_HUMEUR:", cHumeur, "| E_HUMEUR:", eHumeur);

// ── 7. Dump ───────────────────────────────────────────────────────────────────
const out = { ts, emma, emmaPwd, marc, marcPwd, fSource, fCurrent, fHumeur, c2025, c2026, cHumeur, e25, e26self, e26mgr, eHumeur };
fs.writeFileSync("e2e/.edition-demo.json", JSON.stringify(out, null, 2));
console.log("\n✓ Seed écrit dans e2e/.edition-demo.json\n", out);
await ctx.dispose();
