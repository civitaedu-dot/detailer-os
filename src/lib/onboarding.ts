import { supabase } from "@/integrations/supabase/client";

export interface OnboardingData {
  name: string;
  phone: string;
  business_name: string;
  city: string;
  business_type: string;
  employees_count: string;
  years_operating: string;
  monthly_services_avg: number | null;
  monthly_revenue_estimate: number | null;
  main_services: string[];
}

const PENDING_KEY = "detaileros:pending-onboarding";

export const savePendingOnboarding = (data: OnboardingData) => {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
};

export const readPendingOnboarding = (): OnboardingData | null => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as OnboardingData) : null;
  } catch {
    return null;
  }
};

export const clearPendingOnboarding = () => {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* noop */
  }
};

/** Writes onboarding data onto the user's profile. Billing fields are never touched. */
export const saveOnboardingToProfile = async (userId: string, data: OnboardingData) => {
  const { error } = await supabase
    .from("profiles")
    .update({
      name: data.name,
      phone: data.phone || null,
      business_name: data.business_name || null,
      city: data.city || null,
      business_type: data.business_type || null,
      employees_count: data.employees_count || null,
      years_operating: data.years_operating || null,
      monthly_services_avg: data.monthly_services_avg,
      monthly_revenue_estimate: data.monthly_revenue_estimate,
      main_services: data.main_services.length ? data.main_services : null,
      onboarding_completed: true,
    })
    .eq("user_id", userId);

  if (error) throw error;
};

/** Applies any onboarding data captured before the session existed (e.g. email confirmation). */
export const applyPendingOnboarding = async (userId: string) => {
  const pending = readPendingOnboarding();
  if (!pending) return;
  try {
    await saveOnboardingToProfile(userId, pending);
    clearPendingOnboarding();
  } catch {
    /* keep pending for the next attempt */
  }
};

export const BUSINESS_TYPES = [
  "Estética automotiva",
  "Lava-rápido",
  "Detalhamento (detailing)",
  "PPF / Insulfilm",
  "Polimento e vitrificação",
  "Outro",
];

export const EMPLOYEE_RANGES = ["Somente eu", "2 a 3", "4 a 6", "7 a 10", "Mais de 10"];

export const OPERATING_TIME = [
  "Ainda vou abrir",
  "Menos de 1 ano",
  "1 a 3 anos",
  "3 a 5 anos",
  "Mais de 5 anos",
];

export const SERVICE_OPTIONS = [
  "Lavagem detalhada",
  "Polimento",
  "Vitrificação",
  "Higienização interna",
  "PPF",
  "Insulfilm",
  "Martelinho de ouro",
  "Revitalização de faróis",
  "Enceramento",
  "Descontaminação",
];