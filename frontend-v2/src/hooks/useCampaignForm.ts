import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  useForm,
  type UseFormRegister,
  type FieldErrors,
  type UseFormGetValues,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { campaignsApi } from "../api/campaigns";
import { orgApi } from "../api/org";
import { groupsApi } from "../api/groups";
import type { Campaign, CampaignStatus, UserGroup, Sector } from "../types";
import { queryKeys } from "../lib/queryKeys";

export const campaignWizardSchema = z
  .object({
    name: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères")
      .max(100, "Nom trop long"),
    description: z.string().max(500, "Description trop longue"),
    startDate: z.string().min(1, "La date de début est requise"),
    endDate: z.string().min(1, "La date de fin est requise"),
    deadlineEmployee: z.string(),
    deadlineManager: z.string(),
    status: z.enum(["draft", "active", "closed", "archived"] as const),
    targetDepartments: z.array(z.string()),
    extendedVisibility: z.boolean(),
    enableN1Context: z.boolean(),
    n1VisibleToEmployee: z.boolean(),
    previousCampaignId: z.string(),
    targetScope: z.enum([
      "all",
      "department",
      "sector",
      "users",
      "group",
    ] as const),
    targetSectorIds: z.array(z.string()),
    targetUserIds: z.array(z.string()),
    targetGroupId: z.string(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: "La date de fin doit être après la date de début",
      path: ["endDate"],
    },
  );

export type WizardFormValues = z.infer<typeof campaignWizardSchema>;

export const WIZARD_STEPS = [
  { label: "Informations", description: "Identité & dates" },
  { label: "Formulaires", description: "Association" },
  { label: "Public cible", description: "Périmètre" },
  { label: "Récapitulatif", description: "Validation" },
];

const initialValues: WizardFormValues = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  deadlineEmployee: "",
  deadlineManager: "",
  status: "draft" as CampaignStatus,
  targetDepartments: [],
  extendedVisibility: false,
  enableN1Context: false,
  n1VisibleToEmployee: false,
  previousCampaignId: "",
  targetScope: "all",
  targetSectorIds: [],
  targetUserIds: [],
  targetGroupId: "",
};

function buildPayload(form: WizardFormValues): Partial<Campaign> {
  return {
    name: form.name.trim(),
    description: form.description || undefined,
    status: form.status,
    startDate: form.startDate,
    endDate: form.endDate,
    deadlineEmployee: form.deadlineEmployee || undefined,
    deadlineManager: form.deadlineManager || undefined,
    targetDepartments:
      form.targetDepartments.length > 0 ? form.targetDepartments : undefined,
    extendedVisibility: form.extendedVisibility,
    enableN1Context: form.enableN1Context,
    n1VisibleToEmployee: form.enableN1Context
      ? form.n1VisibleToEmployee
      : undefined,
    previousCampaignId:
      form.enableN1Context && form.previousCampaignId
        ? form.previousCampaignId
        : undefined,
    targetScope: form.targetScope,
    targetSectorIds:
      form.targetScope === "sector" ? form.targetSectorIds : undefined,
    targetUserIds:
      form.targetScope === "users" ? form.targetUserIds : undefined,
    targetGroupIds:
      form.targetScope === "group" && form.targetGroupId
        ? [form.targetGroupId]
        : undefined,
  };
}

export interface UseCampaignFormReturn {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  form: WizardFormValues;
  set: <K extends keyof WizardFormValues>(
    key: K,
    value: WizardFormValues[K],
  ) => void;
  getValues: UseFormGetValues<WizardFormValues>;
  currentStep: number;
  totalSteps: number;
  handleNext: () => Promise<void>;
  handlePrev: () => void;
  handleSubmit: () => void;
  prevCampaigns: Campaign[] | undefined;
  sectorsData: Sector[] | undefined;
  groupsData: UserGroup[] | undefined;
  isCreating: boolean;
}

export function useCampaignForm(): UseCampaignFormReturn {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);

  const {
    register,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<WizardFormValues>({
    resolver: zodResolver(campaignWizardSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const form = watch();
  const set = <K extends keyof WizardFormValues>(
    key: K,
    value: WizardFormValues[K],
  ) => setValue(key as never, value as never);

  const { data: prevCampaigns } = useQuery({
    queryKey: ["campaigns-prev"],
    queryFn: () =>
      Promise.all([
        campaignsApi
          .getCampaigns({ status: "closed", limit: 100 })
          .then((r) => r.data.data),
        campaignsApi
          .getCampaigns({ status: "archived", limit: 100 })
          .then((r) => r.data.data),
      ]).then(([c, a]) => [...c, ...a]),
    enabled: form.enableN1Context,
  });

  const { data: sectorsData } = useQuery({
    queryKey: ["org-sectors"],
    queryFn: () => orgApi.getSectors().then((r) => r.data),
    enabled: form.targetScope === "sector",
  });

  const { data: groupsData } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: () => groupsApi.list().then((r) => r.data as UserGroup[]),
    enabled: form.targetScope === "group",
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Campaign>) =>
      campaignsApi.createCampaign(data).then((r) => r.data.data),
    onSuccess: (campaign: Campaign) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
      navigate(`/campaigns/${campaign.id}`);
    },
  });

  async function handleNext() {
    if (currentStep === 0) {
      const valid = await trigger(["name", "startDate", "endDate"]);
      if (!valid) return;
    }
    setCurrentStep((s) => s + 1);
  }

  function handlePrev() {
    setCurrentStep((s) => s - 1);
  }

  function handleSubmit() {
    createMutation.mutate(buildPayload(getValues()));
  }

  return {
    register,
    errors,
    form,
    set,
    getValues,
    currentStep,
    totalSteps: WIZARD_STEPS.length,
    handleNext,
    handlePrev,
    handleSubmit,
    prevCampaigns,
    sectorsData,
    groupsData,
    isCreating: createMutation.isPending,
  };
}
