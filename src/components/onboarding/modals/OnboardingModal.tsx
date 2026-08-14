import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, Check, Building2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/stores/auth";
import api from "@/lib/api";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse, type ErrorResponse } from "@/lib/api-response";
import { useToast } from "@/components/ui/Toaster";
import { OrganizationStep } from "@/components/onboarding/steps/OrganizationStep";
import { StoreStep } from "@/components/onboarding/steps/StoreStep";

interface OnboardingData {
  organization: string;
  slug: string;
  website: string;
  storeName: string;
  type: string;
}

interface AvailabilityStatus {
  slug?: { available: boolean; message: string } | null;
  store_name?: { available: boolean; message: string } | null;
}

const INITIAL: OnboardingData = {
  organization: "",
  slug: "",
  website: "",
  storeName: "",
  type: "Supplier",
};

const STEPS = [
  { key: "organization", label: "Organization", icon: Building2 },
  { key: "store", label: "Your Store", icon: Store },
];

export function OnboardingModal() {
  const { updateUser } = useAuthStore();
  const { success: showSuccess, error: showError } = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityStatus>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAvailability = useCallback(async (slug: string, storeName: string) => {
    if (!slug && !storeName) {
      setAvailability({});
      return;
    }

    setChecking(true);
    try {
      const res = await api.post("check-availability", {
        json: {
          ...(slug ? { slug } : {}),
          ...(storeName ? { store_name: storeName } : {}),
        },
        headers: authHeaders(),
        throwHttpErrors: false,
      });
      const body = await parseApiResponse<AvailabilityStatus>(res);
      if (body.success) {
        setAvailability(body.data);
      }
    } catch {
      setAvailability({});
    } finally {
      setChecking(false);
    }
  }, []);

  // Auto-generate slug from store name
  useEffect(() => {
    const generated = data.storeName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (generated && generated !== data.slug) {
      setData(prev => ({ ...prev, slug: generated }));
    }
  }, [data.storeName]);

  // Debounced availability check when slug or storeName changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const slug = data.slug.trim();
    const name = data.storeName.trim();

    if (!slug && !name) {
      setAvailability({});
      return;
    }

    debounceRef.current = setTimeout(() => {
      checkAvailability(slug, name);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [data.slug, data.storeName, checkAvailability]);

  const isStepComplete = (i: number) => {
    if (i === 0) return data.organization.trim().length > 0;
    if (i === 1) {
      const nameOk = data.storeName.trim().length > 0;
      const slugOk = data.slug.trim().length > 0;
      const slugAvailable = availability.slug ? availability.slug.available : true;
      const nameAvailable = availability.store_name ? availability.store_name.available : true;
      return nameOk && slugOk && slugAvailable && nameAvailable;
    }
    return false;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleFinish = async () => {
    try {
      setLoading(true);

      const res = await api.post("profiles/complete-onboarding", {
        json: {
          organization: data.organization,
          slug: data.slug,
          website: data.website || null,
          store_name: data.storeName,
          business_type: data.type,
        },
        headers: authHeaders(),
        throwHttpErrors: false,
      });

      const body = await parseApiResponse<{ user?: Record<string, unknown> }>(res);

      if (body.success) {
        if (body.data?.user) updateUser(body.data.user as Parameters<typeof updateUser>[0]);
        showSuccess("Welcome aboard! Your store is ready.");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        const apiBody = (error as { body?: ErrorResponse }).body;
        if (apiBody?.errors) {
          const firstError = Object.values(apiBody.errors).flat()[0];
          showError(firstError || apiBody.message || "Please check your inputs.");
        } else {
          showError(error.message || "Something went wrong. Please try again.");
        }
      } else {
        showError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const currentComplete = isStepComplete(step);
  const isLastStep = step === STEPS.length - 1;

  return (
    <Modal
      isOpen={true}
      onClose={() => {}}
      title="Setup Your Store"
      showCloseButton={false}
      closeOnBackdropClick={false}
      maxWidth="3xl"
      noPadding
    >
      <div className="flex h-130">
        {/* Left: Step indicator */}
        <div className="hidden w-56 shrink-0 border-r border-gray-100 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50 sm:block">
          <h3 className="mb-6 text-sm font-semibold text-gray-900 dark:text-white">Setup Progress</h3>
          <div className="space-y-1">
            {STEPS.map((s, i) => {
              const complete = isStepComplete(i);
              const current = i === step;
              return (
                <button
                  key={s.key}
                  onClick={() => { if (complete || i < step) setStep(i); }}
                  disabled={!complete && i > step}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    current
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : complete
                        ? "text-green-700 dark:text-green-400"
                        : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    complete
                      ? "bg-green-500 text-white"
                      : current
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                  }`}>
                    {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="font-medium">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex flex-1 flex-col">
          {/* Mobile step dots */}
          <div className="flex items-center justify-center gap-2 border-b border-gray-100 px-6 py-3 sm:hidden dark:border-gray-700">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${i <= step ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
              />
            ))}
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
            {/* Mobile step label */}
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400 sm:hidden">
              Step {step + 1} of {STEPS.length} &mdash; {STEPS[step]?.label}
            </p>

            {step === 0 && <OrganizationStep data={data} onChange={(partial) => setData(prev => ({ ...prev, ...partial }))} />}
            {step === 1 && (
              <StoreStep
                data={data}
                onChange={(partial) => setData(prev => ({ ...prev, ...partial }))}
                checking={checking}
                availability={availability}
                slugDisabled
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-700">
            {isLastStep ? (
              <Button
                onClick={handleFinish}
                disabled={!currentComplete || loading}
                className="inline-flex items-center gap-1"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Complete Setup
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!currentComplete}
                className="inline-flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
