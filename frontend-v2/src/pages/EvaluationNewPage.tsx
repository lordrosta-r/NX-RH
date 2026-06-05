import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { evaluationsApi } from "../api/evaluations";
import { campaignsApi } from "../api/campaigns";
import { usersApi } from "../api/users";
import { PageHead, Tile, Callout } from "../components/shell";

export default function EvaluationNewPage() {
  const navigate = useNavigate();
  const [campaignId, setCampaignId] = useState("");
  const [evaluateeId, setEvaluateeId] = useState("");
  const [evaluatorId, setEvaluatorId] = useState("");

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns", "active"],
    queryFn: () =>
      campaignsApi.getCampaigns({ status: "active" }).then((r) => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ["users", "list"],
    queryFn: () => usersApi.getUsers({ limit: 200 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      evaluationsApi.createEvaluation({ campaignId, evaluateeId, evaluatorId }),
    onSuccess: (res) => navigate(`/evaluations/${res.data.id}`),
  });

  const usersList = users?.data ?? [];
  const campaignsList = campaigns?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !evaluateeId || !evaluatorId) return;
    createMutation.mutate();
  };

  return (
    <div className="nx-app">
      <PageHead
        title="Nouvelle évaluation"
        desc="Créer une évaluation individuelle"
      />

      <Tile>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <div className="field">
            <label htmlFor="campaign">
              Campagne <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <select
              id="campaign"
              className="input"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              required
            >
              <option value="">Sélectionner une campagne…</option>
              {campaignsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="evaluatee">
              Évalué <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <select
              id="evaluatee"
              className="input"
              value={evaluateeId}
              onChange={(e) => setEvaluateeId(e.target.value)}
              required
            >
              <option value="">Sélectionner un collaborateur…</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="evaluator">
              Évaluateur <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <select
              id="evaluator"
              className="input"
              value={evaluatorId}
              onChange={(e) => setEvaluatorId(e.target.value)}
              required
            >
              <option value="">Sélectionner un évaluateur…</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {createMutation.isError && (
            <Callout tone="red">
              Une erreur est survenue. Veuillez réessayer.
            </Callout>
          )}

          <div className="row" style={{ gap: 12, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => navigate("/evaluations")}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !campaignId ||
                !evaluateeId ||
                !evaluatorId
              }
              className="btn btn-primary"
            >
              {createMutation.isPending ? "Création…" : "Créer l'évaluation"}
            </button>
          </div>
        </form>
      </Tile>
    </div>
  );
}
