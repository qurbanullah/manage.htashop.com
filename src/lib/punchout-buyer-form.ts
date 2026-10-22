import type { PunchoutBuyer, PunchoutBuyerPayload, PunchoutProtocol } from '@/api/punchoutBuyers'

export interface BuyerForm {
  organizationId: string
  contractId: string
  name: string
  code: string
  protocol: '' | PunchoutProtocol
  senderIdentity: string
  fromIdentity: string
  toIdentity: string
  sharedSecret: string
  ociUsername: string
  ociPassword: string
  allowedReturnDomains: string
  defaultCurrency: string
  defaultLocale: string
  hidePrices: boolean
  allowReviews: boolean
  customerPartNumberRequired: boolean
  maxLineItems: string
  maxQuantityPerLine: string
  primaryColor: string
  logoUrl: string
  isActive: boolean
}

export const EMPTY_BUYER_FORM: BuyerForm = {
  organizationId: '',
  contractId: '',
  name: '',
  code: '',
  protocol: 'cxml',
  senderIdentity: '',
  fromIdentity: '',
  toIdentity: '',
  sharedSecret: '',
  ociUsername: '',
  ociPassword: '',
  allowedReturnDomains: '',
  defaultCurrency: 'USD',
  defaultLocale: 'en',
  hidePrices: false,
  allowReviews: false,
  customerPartNumberRequired: true,
  maxLineItems: '200',
  maxQuantityPerLine: '9999',
  primaryColor: '',
  logoUrl: '',
  isActive: true,
}

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

function numberInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

export function formFromBuyer(buyer: PunchoutBuyer): BuyerForm {
  const settings = buyer.settings ?? {}

  return {
    organizationId: buyer.organization_id ? String(buyer.organization_id) : '',
    contractId: buyer.contract_id ? String(buyer.contract_id) : '',
    name: buyer.name,
    code: buyer.code,
    protocol: buyer.protocol ?? '',
    senderIdentity: buyer.sender_identity ?? '',
    fromIdentity: buyer.from_identity ?? '',
    toIdentity: buyer.to_identity ?? '',
    sharedSecret: '',
    ociUsername: buyer.oci_username ?? '',
    ociPassword: '',
    allowedReturnDomains: (buyer.allowed_return_domains ?? []).join(', '),
    defaultCurrency: buyer.default_currency ?? 'USD',
    defaultLocale: buyer.default_locale ?? 'en',
    hidePrices: Boolean(settings.hide_prices),
    allowReviews: Boolean(settings.allow_reviews),
    customerPartNumberRequired: settings.customer_part_number_required !== false,
    maxLineItems: numberInput(settings.max_line_items ?? 200),
    maxQuantityPerLine: numberInput(settings.max_quantity_per_line ?? 9999),
    primaryColor: settings.branding?.primary_color ?? '',
    logoUrl: settings.branding?.logo_url ?? '',
    isActive: buyer.is_active,
  }
}

/**
 * Tenant is pinned server-side. Blank credentials are omitted so editing cannot
 * erase a stored hash.
 */
export function buildPunchoutBuyerPayload(form: BuyerForm): PunchoutBuyerPayload {
  return {
    organization_id: form.organizationId ? Number(form.organizationId) : null,
    contract_id: form.contractId ? Number(form.contractId) : null,
    name: form.name.trim(),
    code: form.code.trim().toLowerCase(),
    protocol: form.protocol || null,
    sender_identity: nullable(form.senderIdentity),
    from_identity: nullable(form.fromIdentity),
    to_identity: nullable(form.toIdentity),
    ...(form.sharedSecret.trim() ? { shared_secret: form.sharedSecret.trim() } : {}),
    oci_username: nullable(form.ociUsername),
    ...(form.ociPassword.trim() ? { oci_password: form.ociPassword.trim() } : {}),
    allowed_return_domains: form.allowedReturnDomains
      .split(/[\n,]+/)
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
    default_currency: nullable(form.defaultCurrency)?.toUpperCase() ?? null,
    default_locale: nullable(form.defaultLocale)?.toLowerCase() ?? null,
    settings: {
      hide_prices: form.hidePrices,
      allow_reviews: form.allowReviews,
      customer_part_number_required: form.customerPartNumberRequired,
      ...(numberOrNull(form.maxLineItems) !== null
        ? { max_line_items: numberOrNull(form.maxLineItems) }
        : {}),
      ...(numberOrNull(form.maxQuantityPerLine) !== null
        ? { max_quantity_per_line: numberOrNull(form.maxQuantityPerLine) }
        : {}),
      branding: {
        logo_url: nullable(form.logoUrl),
        primary_color: nullable(form.primaryColor),
      },
    },
    is_active: form.isActive,
  }
}
