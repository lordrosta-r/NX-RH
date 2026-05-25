import type jsPDF from "jspdf";
import type { Evaluation } from "../types";

type JsPDFInstance = jsPDF;

const PRIMARY: [number, number, number] = [59, 130, 246];
const DARK_GRAY: [number, number, number] = [31, 41, 55];
const LIGHT_GRAY: [number, number, number] = [243, 244, 246];

function fullName(person?: { firstName?: string; lastName?: string }): string {
  return person
    ? `${person.firstName || ""} ${person.lastName || ""}`.trim() || "N/A"
    : "N/A";
}

function fmt(date?: string): string {
  return date ? new Date(date).toLocaleDateString("fr-FR") : "N/A";
}

function drawSectionTitle(
  doc: JsPDFInstance,
  title: string,
  y: number,
): number {
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_GRAY);
  doc.text(title, 15, y);
  y += 2;
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  return y + 8;
}

export function usePdfExport() {
  const exportEvaluationPdf = async (evaluation: Evaluation): Promise<void> => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new JsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // ── En-tête ──────────────────────────────────────────────────────────────
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("NX-RH — Évaluation", 15, 15);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const campaignName =
      typeof evaluation.campaign === "object" && evaluation.campaign
        ? evaluation.campaign.name || "Campagne inconnue"
        : "Campagne inconnue";
    doc.text(campaignName, 15, 25);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 15, 32);

    let y = 45;

    // ── Informations générales ────────────────────────────────────────────────
    y = drawSectionTitle(doc, "Informations générales", y);

    const statusLabel = evaluation.status ?? "N/A";
    const scoreLabel =
      evaluation.reviewerScore != null
        ? `${evaluation.reviewerScore}/100`
        : "Non noté";

    const infoRows: [string, string][] = [
      ["Évalué", fullName(evaluation.evaluatee)],
      ["Évaluateur", fullName(evaluation.evaluator)],
      ["Statut", statusLabel],
      ["Score", scoreLabel],
      ["Formulaire", evaluation.form?.title ?? "N/A"],
      ["Date création", fmt(evaluation.createdAt)],
      ["Dernière MAJ", fmt(evaluation.updatedAt)],
    ];

    autoTable(doc, {
      startY: y,
      body: infoRows,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50, textColor: DARK_GRAY },
        1: { cellWidth: 130 },
      },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
    });

    y =
      (doc as JsPDFInstance & { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 12;
    const sections: Array<{ title: string; content: string }> = [];

    if (evaluation.reviewerComment)
      sections.push({
        title: "Commentaire de l'évaluateur",
        content: evaluation.reviewerComment,
      });
    if (evaluation.evaluateeComment)
      sections.push({
        title: "Commentaire de l'évalué",
        content: evaluation.evaluateeComment,
      });
    if (evaluation.nextYearObjectives)
      sections.push({
        title: "Objectifs N+1",
        content: evaluation.nextYearObjectives,
      });

    for (const section of sections) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      y = drawSectionTitle(doc, section.title, y);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK_GRAY);
      const lines = doc.splitTextToSize(section.content, 175);
      doc.text(lines, 15, y);
      y += lines.length * 5 + 10;
    }

    // ── Questions / Réponses ──────────────────────────────────────────────────
    const questions = evaluation.form?.questions ?? [];
    if (questions.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      y = drawSectionTitle(doc, "Questions & Réponses", y);

      const answers = evaluation.answers ?? {};
      autoTable(doc, {
        startY: y,
        head: [["Question", "Réponse"]],
        body: questions.map((q) => [
          q.text,
          answers[q.id] !== undefined && answers[q.id] !== ""
            ? String(answers[q.id])
            : "—",
        ]),
        theme: "striped",
        headStyles: {
          fillColor: PRIMARY,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
        },
        styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
      });

      y =
        (doc as JsPDFInstance & { lastAutoTable: { finalY: number } })
          .lastAutoTable.finalY + 12;
    }

    // ── Signatures ────────────────────────────────────────────────────────────
    const sigs: Array<{ role: string; date: string }> = [];
    if (evaluation.signedByEvaluateeAt)
      sigs.push({ role: "Évalué", date: fmt(evaluation.signedByEvaluateeAt) });
    if (evaluation.signedByManagerAt)
      sigs.push({ role: "Manager", date: fmt(evaluation.signedByManagerAt) });
    if (evaluation.signedByHrAt)
      sigs.push({ role: "RH", date: fmt(evaluation.signedByHrAt) });

    if (sigs.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      y = drawSectionTitle(doc, "Signatures", y);

      autoTable(doc, {
        startY: y,
        head: [["Rôle", "Date de signature"]],
        body: sigs.map((s) => [s.role, s.date]),
        theme: "striped",
        headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255] },
        styles: { fontSize: 9 },
      });
    }

    // ── Pied de page ──────────────────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `NX-RH — Document confidentiel — Page ${i}/${pageCount}`,
        105,
        290,
        { align: "center" },
      );
    }

    const filename = `evaluation-${evaluation.id || "export"}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  };

  const exportListPdf = async (
    evaluations: Evaluation[],
    title = "Liste des évaluations",
  ): Promise<void> => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new JsPDF();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK_GRAY);
    doc.text(title, 15, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${evaluations.length} évaluation(s) — ${new Date().toLocaleDateString("fr-FR")}`,
      15,
      28,
    );

    autoTable(doc, {
      startY: 35,
      head: [["Évalué", "Évaluateur", "Campagne", "Statut", "Score"]],
      body: evaluations.map((e) => {
        const campaignName =
          typeof e.campaign === "object" && e.campaign
            ? e.campaign.name || "N/A"
            : "N/A";
        return [
          fullName(e.evaluatee),
          fullName(e.evaluator),
          campaignName,
          e.status ?? "N/A",
          e.reviewerScore != null ? `${e.reviewerScore}/100` : "-",
        ];
      }),
      theme: "striped",
      headStyles: { fillColor: PRIMARY },
      styles: { fontSize: 9 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `NX-RH — Document confidentiel — Page ${i}/${pageCount}`,
        105,
        290,
        { align: "center" },
      );
    }

    doc.save(`evaluations-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return { exportEvaluationPdf, exportListPdf };
}
