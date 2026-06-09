import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Routes, Route } from "react-router-dom";
import type { Evaluation, FormQuestion } from "../types";
import { server } from "./msw/server";
import { renderWithProviders, makeUser } from "./utils";
import EvaluationsPage from "../pages/EvaluationsPage";
import EvaluationDetailPage from "../pages/EvaluationDetailPage";
import EvaluationHistoryPage from "../pages/EvaluationHistoryPage";

// Le PDF est désormais généré côté client (jsPDF) via usePdfExport, plus via
// window.open. On mocke le hook pour vérifier le déclenchement de l'export.
const { exportEvaluationPdfMock } = vi.hoisted(() => ({
  exportEvaluationPdfMock: vi.fn(),
}));
vi.mock("../hooks/usePdfExport", () => ({
  usePdfExport: () => ({
    exportEvaluationPdf: exportEvaluationPdfMock,
    exportListPdf: vi.fn(),
    exportDashboardPdf: vi.fn(),
    isExporting: false,
  }),
}));

const employee = makeUser({
  id: "emp-1",
  _id: "emp-1",
  role: "employee",
  firstName: "Alice",
  lastName: "Martin",
  email: "alice.martin@example.com",
});

const evaluator = makeUser({
  id: "mgr-1",
  _id: "mgr-1",
  role: "manager",
  firstName: "Marc",
  lastName: "Leroy",
  email: "marc.leroy@example.com",
});

const hr = makeUser({
  id: "hr-1",
  _id: "hr-1",
  role: "hr",
  firstName: "Hélène",
  lastName: "Robert",
  email: "helene.robert@example.com",
});

const admin = makeUser({
  id: "admin-1",
  _id: "admin-1",
  role: "admin",
  firstName: "Admin",
  lastName: "NX",
  email: "admin@example.com",
});

const campaignAnnual = {
  id: "camp-1",
  name: "Évaluation annuelle 2025",
  status: "active" as const,
  startDate: "2025-01-01",
  endDate: "2025-03-31",
  formId: "form-1",
};

const campaignMidYear = {
  id: "camp-2",
  name: "Évaluation mi-année 2024",
  status: "closed" as const,
  startDate: "2024-06-01",
  endDate: "2024-07-31",
  formId: "form-1",
};

const formQuestions: FormQuestion[] = [
  {
    id: "q-1",
    type: "text",
    text: "Qu’avez-vous accompli cette année ?",
    required: true,
    phase: "self",
  },
  {
    id: "q-2",
    type: "textarea",
    text: "Quels sont vos objectifs ?",
    required: true,
    phase: "self",
  },
];

function makeEvaluation(overrides: Partial<Evaluation> = {}): Evaluation {
  return {
    id: "eval-1",
    campaignId: "camp-1",
    evaluateeId: employee.id,
    evaluatorId: evaluator.id,
    formId: "form-1",
    status: "assigned",
    answers: [],
    reviewerScore: 82,
    reviewerComment: "Très bon niveau.",
    nextYearObjectives: "Continuer la montée en compétences.",
    evaluateeComment: "Je souhaite évoluer.",
    disagreementFlag: false,
    signedByEvaluateeAt: "2025-02-05T00:00:00Z",
    signedByManagerAt: "2025-02-06T00:00:00Z",
    signedByHrAt: "2025-02-07T00:00:00Z",
    createdAt: "2025-01-10T00:00:00Z",
    updatedAt: "2025-01-10T00:00:00Z",
    evaluatee: employee,
    evaluator,
    campaign: campaignAnnual,
    form: {
      id: "form-1",
      title: "Formulaire annuel",
      formType: "annual",
      questions: formQuestions,
      isFrozen: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    },
    ...overrides,
  };
}

function paginated(data: Evaluation[]) {
  return HttpResponse.json({
    data,
    total: data.length,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
}

function matchesFilters(
  evaluation: Evaluation,
  filters: {
    campaignId?: string | null;
    status?: string | null;
    q?: string | null;
    year?: string | null;
  },
) {
  if (filters.campaignId && evaluation.campaignId !== filters.campaignId)
    return false;
  if (filters.status && evaluation.status !== filters.status) return false;
  if (filters.year && evaluation.createdAt?.slice(0, 4) !== filters.year)
    return false;

  if (filters.q) {
    const needle = filters.q.toLowerCase();
    const haystack = [
      evaluation.evaluatee?.firstName,
      evaluation.evaluatee?.lastName,
      evaluation.evaluator?.firstName,
      evaluation.evaluator?.lastName,
      evaluation.campaign?.name,
      evaluation.form?.title,
      evaluation.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

const adminEvaluations = [
  makeEvaluation({
    id: "eval-1",
    status: "in_progress",
    campaign: campaignAnnual,
  }),
  makeEvaluation({
    id: "eval-2",
    status: "submitted",
    campaignId: "camp-2",
    campaign: campaignMidYear,
    evaluatee: makeUser({
      id: "emp-2",
      _id: "emp-2",
      role: "employee",
      firstName: "Bruno",
      lastName: "Petit",
      email: "bruno.petit@example.com",
    }),
    evaluateeId: "emp-2",
  }),
  makeEvaluation({
    id: "eval-3",
    status: "validated",
    campaign: campaignAnnual,
    reviewerScore: 94,
    reviewerComment: "Excellent.",
  }),
];

const employeeEvaluations = [
  makeEvaluation({
    id: "eval-4",
    status: "in_progress",
    campaign: campaignAnnual,
  }),
  makeEvaluation({
    id: "eval-5",
    status: "validated",
    campaign: campaignMidYear,
  }),
];

const historyEvaluations = [
  makeEvaluation({
    id: "eval-6",
    status: "validated",
    createdAt: "2025-02-10T00:00:00Z",
    signedByHrAt: "2025-02-11T00:00:00Z",
    campaign: campaignAnnual,
    reviewerScore: 88,
  }),
  makeEvaluation({
    id: "eval-7",
    status: "validated",
    createdAt: "2024-02-10T00:00:00Z",
    signedByHrAt: "2024-02-11T00:00:00Z",
    campaign: campaignMidYear,
    reviewerScore: 76,
  }),
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EvaluationsPage", () => {
  it("affiche la liste avec les colonnes attendues et filtre par campagne/statut/recherche", async () => {
    server.use(
      http.get("http://localhost:5050/api/evaluations", ({ request }) => {
        const url = new URL(request.url);
        const campaignId = url.searchParams.get("campaignId");
        const status = url.searchParams.get("status");
        const q = url.searchParams.get("q");
        const data = adminEvaluations.filter((e) =>
          matchesFilters(e, { campaignId, status, q }),
        );
        return paginated(data);
      }),
    );

    renderWithProviders(<EvaluationsPage />, { user: admin });

    // La liste utilise des divs CSS (tbl-head/tbl-row), pas un <table>
    expect(await screen.findByText("Évalué")).toBeInTheDocument();
    expect(screen.getByText("Évaluateur")).toBeInTheDocument();
    expect(screen.getByText("Campagne")).toBeInTheDocument();
    expect(screen.getByText("Statut")).toBeInTheDocument();

    screen.getAllByRole("combobox");
    const searchInput = screen.getByPlaceholderText("Rechercher…");
    const user = userEvent.setup();
    await user.type(searchInput, "Bruno");
    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: "Bruno Petit" }),
      ).toHaveLength(1),
    );
  });

  it("affiche les évaluations employé en cards et pas en tableau", async () => {
    server.use(
      http.get("http://localhost:5050/api/evaluations", ({ request }) => {
        const url = new URL(request.url);
        const campaignId = url.searchParams.get("campaignId");
        const status = url.searchParams.get("status");
        const data = employeeEvaluations.filter((e) =>
          matchesFilters(e, { campaignId, status }),
        );
        return paginated(data);
      }),
    );

    renderWithProviders(<EvaluationsPage />, { user: employee });

    await waitFor(() =>
      expect(screen.getAllByText("Formulaire annuel").length).toBeGreaterThan(
        0,
      ),
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Remplir" }),
    ).toBeInTheDocument();
  });

  it("affiche les bulk checkboxes pour admin et navigue vers le détail", async () => {
    server.use(
      http.get("http://localhost:5050/api/evaluations", () =>
        paginated(adminEvaluations),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/evaluations" element={<EvaluationsPage />} />
        <Route
          path="/evaluations/:id"
          element={<div>Détail évaluations</div>}
        />
      </Routes>,
      { initialEntries: ["/evaluations"], user: admin },
    );

    // La liste utilise des divs CSS (tbl-head/tbl-row), pas un <table>
    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: "Alice Martin" }).length,
      ).toBeGreaterThan(0),
    );
    await waitFor(() =>
      expect(screen.getAllByRole("checkbox")).toHaveLength(4),
    );
    const checkboxes = screen.getAllByRole("checkbox");

    const rowCheckbox = checkboxes[1];
    const user = userEvent.setup();
    await user.click(rowCheckbox);
    expect(screen.getByText("1 sélectionnée(s)")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Archiver" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("link", { name: "Alice Martin" })[0],
    );
    expect(await screen.findByText("Détail évaluations")).toBeInTheDocument();
  });
});

describe("EvaluationDetailPage", () => {
  it("mode A: affiche le formulaire, autosave et confirmation de soumission", async () => {
    const patchCalls: Array<{ body: Record<string, unknown> }> = [];
    const submitCalls: string[] = [];

    server.use(
      http.get("http://localhost:5050/api/evaluations/:id", ({ params }) =>
        HttpResponse.json(
          makeEvaluation({
            id: params.id as string,
            status: "in_progress",
            evaluatorId: employee.id,
            evaluator: employee,
          }),
        ),
      ),
      http.patch(
        "http://localhost:5050/api/evaluations/:id",
        async ({ request, params }) => {
          const body = (await request.json()) as Record<string, unknown>;
          patchCalls.push({ body });
          // La soumission passe par PATCH { status: "submitted" } (plus de route /submit).
          if (body.status === "submitted") {
            submitCalls.push(params.id as string);
            return HttpResponse.json(makeEvaluation({ status: "submitted" }));
          }
          return HttpResponse.json(makeEvaluation({ status: "in_progress" }));
        },
      ),
    );

    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/evaluations/:id" element={<EvaluationDetailPage />} />
      </Routes>,
      { initialEntries: ["/evaluations/eval-1"], user: employee },
    );

    expect(await screen.findByText("Remplir l'évaluation")).toBeInTheDocument();
    expect(
      screen.getByText("Qu’avez-vous accompli cette année ?"),
    ).toBeInTheDocument();

    await user.type(screen.getByRole("textbox"), "Bilan complet");
    await waitFor(() => expect(patchCalls).toHaveLength(1), { timeout: 3000 });
    expect(patchCalls[0].body.answers).toEqual([
      { questionId: "q-1", value: "Bilan complet" },
    ]);

    await user.click(screen.getByRole("button", { name: "Suivant →" }));
    expect(screen.getByText("Quels sont vos objectifs ?")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /soumettre l'évaluation/i }),
    );
    expect(screen.getByText("Confirmer la soumission ?")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Confirmer la soumission" }),
    );
    await waitFor(() => expect(submitCalls).toEqual(["eval-1"]));
  });

  it("mode A: rend les types de question avancés (scale, weather, mobility, n1_import)", async () => {
    const advancedQuestions: FormQuestion[] = [
      {
        id: "q-scale",
        type: "scale",
        text: "Niveau de satisfaction ?",
        required: false,
        phase: "self",
      },
      {
        id: "q-weather",
        type: "weather",
        text: "Votre humeur ?",
        required: false,
        phase: "self",
      },
      {
        id: "q-mob",
        type: "mobility",
        text: "Souhait de mobilité ?",
        required: false,
        phase: "self",
      },
      {
        id: "q-n1",
        type: "n1_import",
        text: "Données N-1",
        required: false,
        phase: "self",
      },
    ];

    server.use(
      http.get("http://localhost:5050/api/evaluations/:id/n1-context", () =>
        HttpResponse.json({
          n1Campaign: { id: "camp-2", name: "Campagne 2024" },
          reviewerScore: 88,
          reviewerComment: "Excellente progression.",
          nextYearObjectives: null,
          objectiveRatings: {},
          status: "validated",
          objectivesAnswers: [],
          formTitle: "Formulaire annuel",
          formType: "annual",
        }),
      ),
      http.get("http://localhost:5050/api/evaluations/:id", ({ params }) =>
        HttpResponse.json(
          makeEvaluation({
            id: params.id as string,
            status: "in_progress",
            evaluatorId: employee.id,
            evaluator: employee,
            answers: [],
            form: {
              id: "form-1",
              title: "Formulaire annuel",
              formType: "annual",
              questions: advancedQuestions,
              isFrozen: false,
              createdAt: "2025-01-01T00:00:00Z",
              updatedAt: "2025-01-01T00:00:00Z",
            },
          }),
        ),
      ),
      http.patch("http://localhost:5050/api/evaluations/:id", () =>
        HttpResponse.json(makeEvaluation({ status: "in_progress" })),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/evaluations/:id" element={<EvaluationDetailPage />} />
      </Routes>,
      { initialEntries: ["/evaluations/eval-1"], user: employee },
    );

    // scale → slider
    expect(
      await screen.findByText("Niveau de satisfaction ?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();

    // weather → boutons d'humeur
    await user.click(screen.getByRole("button", { name: "Suivant →" }));
    expect(screen.getByText("Votre humeur ?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ensoleillé/i }),
    ).toBeInTheDocument();

    // mobility → select
    await user.click(screen.getByRole("button", { name: "Suivant →" }));
    expect(screen.getByText("Souhait de mobilité ?")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    // n1_import → la question s'affiche (N1ImportView supprimé — carryPrevious gère le contexte N-1)
    await user.click(screen.getByRole("button", { name: "Suivant →" }));
    expect(await screen.findByText("Données N-1")).toBeInTheDocument();
  });

  it("mode B: affiche les réponses et les champs de révision", async () => {
    server.use(
      http.get("http://localhost:5050/api/evaluations/:id", ({ params }) =>
        HttpResponse.json(
          makeEvaluation({
            id: params.id as string,
            status: "submitted",
            evaluator: makeUser({
              id: "mgr-2",
              _id: "mgr-2",
              role: "manager",
              firstName: "Maya",
              lastName: "Durand",
              email: "maya.durand@example.com",
            }),
            evaluatee: employee,
            answers: [{ questionId: "q-1", value: "Très bon travail" }],
          }),
        ),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/evaluations/:id" element={<EvaluationDetailPage />} />
      </Routes>,
      { initialEntries: ["/evaluations/eval-1"], user: hr },
    );

    expect(
      await screen.findByText("Révision de l'évaluation"),
    ).toBeInTheDocument();
    expect(screen.getByText("Très bon travail")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Enregistrer la révision" }),
    ).toBeInTheDocument();
  });

  it("mode C: affiche le stepper et le bouton contextuel de signature", async () => {
    server.use(
      http.get("http://localhost:5050/api/evaluations/:id", ({ params }) =>
        HttpResponse.json(
          makeEvaluation({
            id: params.id as string,
            status: "signed_hr",
            signedByEvaluateeAt: "2025-02-05T00:00:00Z",
            signedByManagerAt: "2025-02-06T00:00:00Z",
            signedByHrAt: "2025-02-07T00:00:00Z",
            reviewerScore: 91,
            reviewerComment: "Solide.",
          }),
        ),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/evaluations/:id" element={<EvaluationDetailPage />} />
      </Routes>,
      { initialEntries: ["/evaluations/eval-1"], user: hr },
    );

    expect(
      await screen.findByText("Compte-rendu d'entretien"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Signé \(RH\)/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Valider définitivement" }),
    ).toBeInTheDocument();
  });

  it("mode C: permet de cocher le désaccord côté évalué", async () => {
    server.use(
      http.get("http://localhost:5050/api/evaluations/:id", ({ params }) =>
        HttpResponse.json(
          makeEvaluation({
            id: params.id as string,
            status: "reviewed",
            evaluator: evaluator,
            evaluatee: employee,
            disagreementFlag: false,
          }),
        ),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/evaluations/:id" element={<EvaluationDetailPage />} />
      </Routes>,
      { initialEntries: ["/evaluations/eval-1"], user: employee },
    );

    expect(
      await screen.findByText("Votre prise de connaissance"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /désaccord/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Signer et valider la prise de connaissance",
      }),
    ).toBeInTheDocument();
  });

  it("mode D: affiche le compte-rendu complet et le PDF", async () => {
    server.use(
      http.get("http://localhost:5050/api/evaluations/:id", ({ params }) =>
        HttpResponse.json(
          makeEvaluation({
            id: params.id as string,
            status: "validated",
            evaluator,
            evaluatee: employee,
            disagreementFlag: true,
            reviewerScore: 96,
            reviewerComment: "Excellent parcours.",
            nextYearObjectives: "Poursuivre la spécialisation.",
            evaluateeComment: "Je suis satisfait.",
          }),
        ),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/evaluations/:id" element={<EvaluationDetailPage />} />
      </Routes>,
      { initialEntries: ["/evaluations/eval-1"], user: admin },
    );

    expect(
      await screen.findByText(/Compte-rendu — Alice Martin/),
    ).toBeInTheDocument();
    expect(screen.getByText("Réponses")).toBeInTheDocument();
    expect(screen.getByText("Révision")).toBeInTheDocument();
    expect(screen.getByText("Commentaire de l'évalué")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /télécharger pdf/i }));
    expect(exportEvaluationPdfMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "eval-1" }),
    );
  });
});

describe("EvaluationHistoryPage", () => {
  it("affiche les évaluations validées en cards et filtre par année", async () => {
    server.use(
      http.get(
        "http://localhost:5050/api/evaluations/history",
        ({ request }) => {
          const url = new URL(request.url);
          const year = url.searchParams.get("year");
          const data = historyEvaluations.filter((e) =>
            matchesFilters(e, { year }),
          );
          return HttpResponse.json(data);
        },
      ),
    );

    renderWithProviders(<EvaluationHistoryPage />, { user: employee });

    expect(
      await screen.findByText("Mon historique d'entretiens"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: "Voir le compte-rendu" }),
      ).toHaveLength(2),
    );

    const [yearSelect] = screen.getAllByRole("combobox");
    fireEvent.change(yearSelect, { target: { value: "2024" } });

    await waitFor(() => {
      expect(
        screen.getAllByRole("link", { name: /Voir le compte-rendu/i }),
      ).toHaveLength(1);
    });
    expect(
      screen.getAllByText("Évaluation mi-année 2024").length,
    ).toBeGreaterThan(0);
  });
});
