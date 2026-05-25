import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { campaignsApi } from "../api/campaigns";
import { formsApi } from "../api/forms";
import type { Campaign, Form } from "../types";

export interface CampaignAnalytics {
  statusDistribution?: {
    in_progress?: number;
    submitted?: number;
    validated?: number;
  };
  totalEvaluations?: number;
  completedEvaluations?: number;
}

interface FormMutation {
  mutate: (formId: string) => void;
  isPending: boolean;
}

export interface UseCampaignDetailReturn {
  campaign: Campaign | undefined;
  isLoading: boolean;
  analytics: CampaignAnalytics | undefined;
  analyticsLoading: boolean;
  allForms: Form[];
  isAdminOrHr: boolean;
  addFormModal: boolean;
  setAddFormModal: (v: boolean) => void;
  activate: () => void;
  isActivating: boolean;
  close: () => void;
  isClosing: boolean;
  archive: () => void;
  isArchiving: boolean;
  remove: () => void;
  isDeleting: boolean;
  clone: () => void;
  isCloning: boolean;
  linkForm: FormMutation;
  unlinkForm: FormMutation;
}

export function useCampaignDetail(
  id: string | undefined,
): UseCampaignDetailReturn {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [addFormModal, setAddFormModal] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["campaign", id] });

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => campaignsApi.getCampaign(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const isAdminOrHr = user?.role === "admin" || user?.role === "hr";

  const { data: analytics, isLoading: analyticsLoading } =
    useQuery<CampaignAnalytics>({
      queryKey: ["campaign-analytics", campaign?._id],
      queryFn: () => campaignsApi.getCampaignAnalytics(id!).then((r) => r.data),
      enabled: !!campaign?._id && isAdminOrHr,
      staleTime: 2 * 60 * 1000,
    });

  const { data: allFormsData } = useQuery({
    queryKey: ["forms-library"],
    queryFn: () => formsApi.getForms({ limit: 200 }).then((r) => r.data),
    enabled: addFormModal,
  });

  const activateMutation = useMutation({
    mutationFn: () => campaignsApi.activateCampaign(id!),
    onSuccess: invalidate,
  });

  const closeMutation = useMutation({
    mutationFn: () => campaignsApi.closeCampaign(id!),
    onSuccess: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: () => campaignsApi.archiveCampaign(id!),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => campaignsApi.deleteCampaign(id!),
    onSuccess: () => navigate("/campaigns"),
  });

  const cloneMutation = useMutation({
    mutationFn: () => campaignsApi.cloneCampaign(id!).then((r) => r.data),
    onSuccess: (newCampaign: Campaign) =>
      navigate(`/campaigns/${newCampaign.id}`),
  });

  const linkFormMutation = useMutation({
    mutationFn: (formId: string) => campaignsApi.linkForm(id!, formId),
    onSuccess: () => {
      invalidate();
      setAddFormModal(false);
    },
  });

  const unlinkFormMutation = useMutation({
    mutationFn: (formId: string) => campaignsApi.unlinkForm(id!, formId),
    onSuccess: invalidate,
  });

  return {
    campaign,
    isLoading,
    analytics,
    analyticsLoading,
    allForms: (allFormsData as { data?: Form[] } | undefined)?.data ?? [],
    isAdminOrHr,
    addFormModal,
    setAddFormModal,
    activate: () => activateMutation.mutate(),
    isActivating: activateMutation.isPending,
    close: () => closeMutation.mutate(),
    isClosing: closeMutation.isPending,
    archive: () => archiveMutation.mutate(),
    isArchiving: archiveMutation.isPending,
    remove: () => deleteMutation.mutate(),
    isDeleting: deleteMutation.isPending,
    clone: () => cloneMutation.mutate(),
    isCloning: cloneMutation.isPending,
    linkForm: {
      mutate: (formId: string) => linkFormMutation.mutate(formId),
      isPending: linkFormMutation.isPending,
    },
    unlinkForm: {
      mutate: (formId: string) => unlinkFormMutation.mutate(formId),
      isPending: unlinkFormMutation.isPending,
    },
  };
}
