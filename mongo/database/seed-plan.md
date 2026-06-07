# NX-RH Seed Plan

## 0) Ground rules
- Users: role, department, managerId, authSource, isActive, offboardingStatus
- Campaigns: draft|active|closed|archived, targetDepartments, previousCampaignId, enableN1Context, n1VisibleToEmployee, objectivesFormId
- Forms: self_evaluation, manager_evaluation, upward_feedback, objectives, mobility_request, promotion_request
- Evaluations: ALL statuses in EVALUATION_STATUSES
- Offboarding: unique per user, 5-step checklist
- Events: deadline|interview|meeting|feedback|campaign
- Resources: pdf|xlsx|docx|pptx, draft/published

## 1) Execution order
1. Sectors
2. Users (top-down: admin/hr/director → managers → employees)
3. Config entries
4. Campaigns (N-2, N-1, 2026)
5. Forms (all required types)
6. Attach campaign.objectivesFormId to 2026
7. Evaluations
8. OffboardingRequests
9. Update offboarding user flags
10. Events, Resources, Notifications, AuditLogs

## 2) Sectors
1. Innovation — #17A8D4 — "Équipes produit, ingénierie et plateforme."
2. Fonctions Support — #7C3AED — "RH, finance, juridique et opérations."
3. Commercial & Client — #F97316 — "Sales, marketing et customer success."

## 3) Users
| Email | Name | Role | Department | Manager | authSource | isActive | Notes |
|---|---|---|---|---|---|---|---|
| admin@nx-rh.fr | Alice Moreau | admin | HR | null | local | true | seed owner |
| rh@nx-rh.fr | Hugo Lambert | hr | HR | admin | local | true | HR admin |
| direction@nx-rh.fr | Claire Bernard | director | Executive | admin | local | true | executive |
| manager-it@nx-rh.fr | Julien Robert | manager | Engineering | direction | local | true | team lead |
| manager-marketing@nx-rh.fr | Marie Dubois | manager | Marketing | direction | ldap | true | LDAP user |
| employee-a@nx-rh.fr | Élodie Martin | employee | Engineering | manager-it | local | true | in_progress evals |
| employee-b@nx-rh.fr | Thomas Petit | employee | Engineering | manager-it | local | true | active |
| employee-c@nx-rh.fr | Sarah Leroy | employee | Marketing | manager-marketing | local | true | active |
| employee-d@nx-rh.fr | Antoine Faure | employee | Finance | rh | local | false | inactive |
| employee-e@nx-rh.fr | Camille Girard | employee | Engineering | manager-it | ldap | true | LDAP authSource |
| employee-offboarding@nx-rh.fr | Nicolas Rousseau | employee | Sales | manager-marketing | local | offboarding | in offboarding |

## 4) Campaigns
- N-2 (2024): archived, startDate 2024-01-15, endDate 2024-03-31, Engineering+Marketing+Finance
- N-1 (2025): closed, startDate 2025-01-10, endDate 2025-03-31, same depts, previousCampaignId=N-2
- 2026: active, startDate 2026-01-05, endDate 2026-03-31, Engineering+Marketing+Finance+HR, previousCampaignId=N-1

## 5) Forms
- self_evaluation: questions rating/text/yes_no/scale/objective_item, campaignId=2026
- manager_evaluation: rating/text/yes_no, campaignId=2026
- upward_feedback: rating/text, isAnonymous=true, campaignId=2026
- objectives: objective_item/text, campaignId=2026
- mobility_request: choice/text/yes_no, campaignId=null (template)
- promotion_request: text/yes_no, campaignId=null (template)

## 6) Evaluations (one per status minimum)
- assigned: employee-b, self_evaluation, 2026, no answers
- in_progress: employee-a, self_evaluation, 2026, partial answers
- submitted: employee-c, self_evaluation, 2026, full answers
- reviewed: employee-a, manager_evaluation (manager-it evaluates employee-a), 2026
- signed_evaluatee: employee-a signed after review
- signed_manager: manager signature done
- signed_hr: HR signature done
- validated: completed final eval
- expired: 2025 eval with past expiresAt
- archived: eval for employee-offboarding

## 7) OffboardingRequests
- IN PROGRESS: employee-offboarding, reason=resignation, lastDay=2026-02-28, 2/5 checklist done
- COMPLETED: employee-d, reason=termination, lastDay=2025-12-15, all done

## 8) Events (11, Jan-Mar 2026)
1. Lancement campagne 2026 — deadline — 2026-01-05
2. Deadline auto-évaluations — deadline — 2026-01-31
3. Réunion calibration managers — meeting — 2026-02-03
4. Entretiens manager vague 1 — interview — 2026-02-10
5. Comité RH mensuel — meeting — 2026-02-12
6. Deadline évaluations manager — deadline — 2026-02-15
7. Entretien directeur/managers — interview — 2026-02-20
8. Point offboarding — meeting — 2026-02-24
9. Clôture retours employés — deadline — 2026-03-10
10. Jury promotions — meeting — 2026-03-18
11. Fin campagne 2026 — deadline — 2026-03-31

## 9) Resources (5)
1. Guide auto-évaluation 2026 — pdf — published
2. Charte des entretiens annuels — pdf — published
3. Grille de compétences — xlsx — published
4. Modèle objectifs N+1 — xlsx — draft
5. Processus mobilité interne — pdf — draft

## 10) Notifications (10+ per key user)
Types: eval_assigned, eval_submitted, eval_reviewed, eval_signed_evaluatee, eval_signed_manager, eval_signed_hr, eval_reminder_deadline, eval_expired, campaign_launched, campaign_closed, request_submitted, request_treated, request_rejected, reminder, system

## 11) AuditLogs (20+)
Actions: login, login_failed, status_change, evaluation_update, reassigned, bulk_action, campaign_create, campaign_activate, campaign_update, campaign_delete, offboard, offboarding_create, offboarding_update, offboarding_delete, gdpr_anonymize

## 12) Config entries
- ldap.enabled → true
- ldap.baseDn → "dc=nx-rh,dc=fr"
- ldap.url → "ldaps://ldap.nx-rh.fr"
- app.features → { offboarding: true, analytics: true, objectives: true }

## Password for all local users: Test1234!
