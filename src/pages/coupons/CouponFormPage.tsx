import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { paths } from "@/routes/paths";
import {
  COUPON_TYPE_OPTIONS,
  couponsApi,
  type Coupon,
  type CouponPayload,
  type CouponType,
} from "@/api/coupons";

interface FormState {
  code: string;
  label: string;
  type: CouponType;
  value: string;
  min_order_amount: string;
  max_discount_amount: string;
  starts_at: string;
  ends_at: string;
  usage_limit: string;
  per_user_limit: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  code: "",
  label: "",
  type: "fixed",
  value: "",
  min_order_amount: "",
  max_discount_amount: "",
  starts_at: "",
  ends_at: "",
  usage_limit: "",
  per_user_limit: "",
  is_active: true,
};

const pad = (value: number) => String(value).padStart(2, "0");

/** ISO string → the `YYYY-MM-DDTHH:mm` shape a datetime-local input expects. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local value → ISO 8601, or null when cleared. */
function toIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isNonNegativeNumber(raw: string): boolean {
  const value = Number(raw);
  return !Number.isNaN(value) && value >= 0;
}

function formFromCoupon(coupon: Coupon): FormState {
  return {
    code: coupon.code,
    label: coupon.label ?? "",
    type: coupon.type,
    value: String(coupon.value),
    min_order_amount: coupon.min_order_amount === null ? "" : String(coupon.min_order_amount),
    max_discount_amount:
      coupon.max_discount_amount === null ? "" : String(coupon.max_discount_amount),
    starts_at: toLocalInput(coupon.starts_at),
    ends_at: toLocalInput(coupon.ends_at),
    usage_limit: coupon.usage_limit === null ? "" : String(coupon.usage_limit),
    per_user_limit: coupon.per_user_limit === null ? "" : String(coupon.per_user_limit),
    is_active: coupon.is_active,
  };
}

function validate(form: FormState, coupon: Coupon | null): Record<string, string> {
  const errors: Record<string, string> = {};

  const code = form.code.trim();
  if (!code) {
    errors.code = "A code is required.";
  } else if (code.length > 50) {
    errors.code = "The code must be 50 characters or fewer.";
  }

  const value = Number(form.value);
  if (form.value.trim() === "" || Number.isNaN(value)) {
    errors.value = "A value is required.";
  } else if (value <= 0) {
    errors.value = "The value must be greater than 0.";
  } else if (form.type === "percent" && value > 100) {
    errors.value = "A percentage discount can't be more than 100%.";
  }

  if (form.min_order_amount.trim() !== "" && !isNonNegativeNumber(form.min_order_amount)) {
    errors.min_order_amount = "Enter a valid amount (0 or more).";
  }
  if (form.max_discount_amount.trim() !== "" && !isNonNegativeNumber(form.max_discount_amount)) {
    errors.max_discount_amount = "Enter a valid amount (0 or more).";
  }

  if (form.starts_at && form.ends_at && new Date(form.ends_at) < new Date(form.starts_at)) {
    errors.ends_at = "The end date must be on or after the start date.";
  }

  if (form.usage_limit.trim() !== "") {
    const limit = Number(form.usage_limit);
    if (!Number.isInteger(limit) || limit < 1) {
      errors.usage_limit = "Enter a whole number of at least 1.";
    } else if (coupon && limit < coupon.used_count) {
      errors.usage_limit = `Can't be lower than ${coupon.used_count} — the number of times this code has already been used.`;
    }
  }

  if (form.per_user_limit.trim() !== "") {
    const limit = Number(form.per_user_limit);
    if (!Number.isInteger(limit) || limit < 1) {
      errors.per_user_limit = "Enter a whole number of at least 1.";
    }
  }

  return errors;
}

function buildPayload(form: FormState): CouponPayload {
  const trimmed = (raw: string) => (raw.trim() === "" ? null : raw.trim());
  const numeric = (raw: string) => (raw.trim() === "" ? null : Number(raw));

  return {
    code: form.code.trim().toUpperCase(),
    label: trimmed(form.label),
    type: form.type,
    value: Number(form.value),
    min_order_amount: numeric(form.min_order_amount),
    max_discount_amount: numeric(form.max_discount_amount),
    starts_at: toIso(form.starts_at),
    ends_at: toIso(form.ends_at),
    usage_limit: numeric(form.usage_limit),
    per_user_limit: numeric(form.per_user_limit),
    is_active: form.is_active,
  };
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  help,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  help?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      {children}
      {help && !error && <p className="text-xs text-gray-500 dark:text-gray-400">{help}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export default function CouponFormPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success: showSuccess } = useToast();

  const isEdit = Boolean(uuid);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const couponQuery = useQuery({
    queryKey: ["coupon", uuid],
    queryFn: () => couponsApi.get(uuid as string),
    enabled: isEdit,
    retry: false,
  });

  const coupon = couponQuery.data ?? null;

  useEffect(() => {
    if (couponQuery.data) {
      setForm(formFromCoupon(couponQuery.data));
    }
  }, [couponQuery.data]);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const errorClass = (field: string) =>
    errors[field] ? "border-red-500 focus-visible:ring-red-500" : "";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const validation = validate(form, coupon);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (uuid) {
        await couponsApi.update(uuid, payload);
        showSuccess("Discount code updated");
      } else {
        await couponsApi.create(payload);
        showSuccess("Discount code created");
      }
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      navigate(paths.coupons);
    } catch (e) {
      if (isApiError(e) && e.status === 403) {
        setFormError(
          "Your account isn't linked to an active organization or tenant, so this code can't be saved.",
        );
      } else if (isApiError(e) && e.errors && Object.keys(e.errors).length > 0) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(e.errors)) {
          const first = messages?.[0];
          if (first) fieldErrors[key] = first;
        }
        setErrors(fieldErrors);
        setFormError(Object.keys(fieldErrors).length === 0 ? e.message : null);
      } else {
        setFormError(isApiError(e) ? e.message : "Failed to save the discount code");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Edit: loading / not found / no scope ──

  if (isEdit && couponQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isEdit && couponQuery.isError) {
    const noScope = isApiError(couponQuery.error) && couponQuery.error.status === 403;
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <TicketPercent
          className={cn(
            "mb-4 h-12 w-12",
            noScope ? "text-gray-300 dark:text-gray-600" : "text-red-300 dark:text-red-600",
          )}
        />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {noScope ? "No store assigned" : "Discount code not found"}
        </h3>
        <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
          {noScope
            ? "Your account isn't linked to an active organization or tenant, so there are no discount codes to manage."
            : "This code doesn't exist or isn't available to your account."}
        </p>
        <Link to={paths.coupons} className="mt-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to discount codes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={paths.coupons}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit discount code" : "New discount code"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEdit
              ? "Update the code, its value, limits, or schedule."
              : "Create a code your customers can apply at checkout."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
            {formError}
          </div>
        )}

        <FormSection
          title="Discount"
          description="What the code is called and how much it takes off."
        >
          <Field label="Code" htmlFor="field-code" required error={errors.code}>
            <Input
              id="field-code"
              value={form.code}
              onChange={(e) => update({ code: e.target.value.toUpperCase() })}
              placeholder="e.g. SPRING10"
              maxLength={50}
              autoComplete="off"
              spellCheck={false}
              className={cn("h-10 font-mono uppercase", errorClass("code"))}
            />
          </Field>

          <Field label="Label" htmlFor="field-label" error={errors.label} help="Optional, for your own reference.">
            <Input
              id="field-label"
              value={form.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="e.g. Spring sale"
              className={cn("h-10", errorClass("label"))}
            />
          </Field>

          <Field label="Type" htmlFor="field-type" required error={errors.type}>
            <select
              id="field-type"
              value={form.type}
              onChange={(e) => update({ type: e.target.value as CouponType })}
              className={cn(
                "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100",
                errorClass("type"),
              )}
            >
              {COUPON_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={form.type === "percent" ? "Value (%)" : "Value"}
            htmlFor="field-value"
            required
            error={errors.value}
            help={form.type === "percent" ? "Between 1 and 100." : "Amount off each order."}
          >
            <Input
              id="field-value"
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={(e) => update({ value: e.target.value })}
              placeholder={form.type === "percent" ? "10" : "25"}
              className={cn("h-10", errorClass("value"))}
            />
          </Field>
        </FormSection>

        <FormSection
          title="Conditions"
          description="Optional limits on when the discount applies."
        >
          <Field
            label="Minimum order amount"
            htmlFor="field-min_order_amount"
            error={errors.min_order_amount}
            help="Cart subtotal required before the code applies."
          >
            <Input
              id="field-min_order_amount"
              type="number"
              min="0"
              step="0.01"
              value={form.min_order_amount}
              onChange={(e) => update({ min_order_amount: e.target.value })}
              placeholder="No minimum"
              className={cn("h-10", errorClass("min_order_amount"))}
            />
          </Field>

          <Field
            label="Maximum discount amount"
            htmlFor="field-max_discount_amount"
            error={errors.max_discount_amount}
            help="Caps the discount, useful for percentage codes."
          >
            <Input
              id="field-max_discount_amount"
              type="number"
              min="0"
              step="0.01"
              value={form.max_discount_amount}
              onChange={(e) => update({ max_discount_amount: e.target.value })}
              placeholder="No cap"
              className={cn("h-10", errorClass("max_discount_amount"))}
            />
          </Field>

          <Field
            label="Per-user limit"
            htmlFor="field-per_user_limit"
            error={errors.per_user_limit}
            help="How many times one customer may use this code."
          >
            <Input
              id="field-per_user_limit"
              type="number"
              min="1"
              step="1"
              value={form.per_user_limit}
              onChange={(e) => update({ per_user_limit: e.target.value })}
              placeholder="Unlimited"
              className={cn("h-10", errorClass("per_user_limit"))}
            />
          </Field>
        </FormSection>

        <FormSection title="Schedule" description="Leave blank for a code that is always available.">
          <Field label="Starts at" htmlFor="field-starts_at" error={errors.starts_at}>
            <Input
              id="field-starts_at"
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => update({ starts_at: e.target.value })}
              className={cn("h-10", errorClass("starts_at"))}
            />
          </Field>

          <Field label="Ends at" htmlFor="field-ends_at" error={errors.ends_at}>
            <Input
              id="field-ends_at"
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => update({ ends_at: e.target.value })}
              className={cn("h-10", errorClass("ends_at"))}
            />
          </Field>
        </FormSection>

        <FormSection
          title="Usage & status"
          description="Total redemptions allowed and whether the code is live."
        >
          <Field
            label="Usage limit"
            htmlFor="field-usage_limit"
            error={errors.usage_limit}
            help={
              coupon
                ? `Used ${coupon.used_count} time${coupon.used_count === 1 ? "" : "s"} so far. Leave blank for unlimited.`
                : "Total redemptions allowed. Leave blank for unlimited."
            }
          >
            <Input
              id="field-usage_limit"
              type="number"
              min="1"
              step="1"
              value={form.usage_limit}
              onChange={(e) => update({ usage_limit: e.target.value })}
              placeholder="Unlimited"
              className={cn("h-10", errorClass("usage_limit"))}
            />
          </Field>

          <div className="space-y-1.5 sm:pt-7">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update({ is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Active
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Inactive codes are kept but can't be applied at checkout.
            </p>
          </div>
        </FormSection>

        {coupon && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Scope:{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {coupon.scope === "organization"
                ? "Your organization"
                : coupon.scope === "tenant"
                  ? "Your tenant"
                  : "Global"}
            </span>
            {" · "}
            {coupon.used_count} redeemed
            {coupon.usage_limit === null
              ? " · unlimited"
              : ` · ${coupon.remaining ?? 0} remaining`}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(paths.coupons)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create code"}
          </Button>
        </div>
      </form>
    </div>
  );
}
