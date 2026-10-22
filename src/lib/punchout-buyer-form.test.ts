import { describe, expect, it } from 'vitest'
import type { PunchoutBuyer } from '@/api/punchoutBuyers'
import {
  buildPunchoutBuyerPayload,
  EMPTY_BUYER_FORM,
  formFromBuyer,
} from '@/lib/punchout-buyer-form'

function buyer(overrides: Partial<PunchoutBuyer> = {}): PunchoutBuyer {
  return {
    id: 1,
    uuid: 'buyer-1',
    tenant_id: 7,
    organization_id: 12,
    contract_id: 4,
    name: 'Acme Procurement',
    code: 'acme',
    protocol: 'cxml',
    sender_identity: 'ACME-NETWORK',
    from_identity: 'ACME-BUYER',
    to_identity: 'HTASHOP',
    oci_username: null,
    allowed_return_domains: ['*.acme.example'],
    default_currency: 'EUR',
    default_locale: 'de',
    settings: {
      hide_prices: true,
      customer_part_number_required: false,
      max_line_items: 100,
      branding: { primary_color: '#123456' },
    },
    is_active: true,
    has_shared_secret: true,
    has_previous_shared_secret: false,
    has_oci_password: false,
    secret_rotated_at: null,
    last_seen_at: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

describe('formFromBuyer', () => {
  it('maps the resource without exposing stored secrets', () => {
    const form = formFromBuyer(buyer())

    expect(form.organizationId).toBe('12')
    expect(form.contractId).toBe('4')
    expect(form.protocol).toBe('cxml')
    expect(form.sharedSecret).toBe('')
    expect(form.ociPassword).toBe('')
    expect(form.allowedReturnDomains).toBe('*.acme.example')
    expect(form.customerPartNumberRequired).toBe(false)
  })
})

describe('buildPunchoutBuyerPayload', () => {
  it('never sends a tenant', () => {
    const payload = buildPunchoutBuyerPayload({
      ...EMPTY_BUYER_FORM,
      name: 'Acme',
      code: 'ACME',
      organizationId: '12',
      contractId: '4',
      sharedSecret: 'a-long-machine-secret',
    })

    expect(payload).not.toHaveProperty('tenant_id')
    expect(payload).toMatchObject({
      organization_id: 12,
      contract_id: 4,
      name: 'Acme',
      code: 'acme',
      shared_secret: 'a-long-machine-secret',
    })
  })

  it('omits blank credentials so editing cannot erase a stored secret', () => {
    const payload = buildPunchoutBuyerPayload({
      ...EMPTY_BUYER_FORM,
      name: 'Acme',
      code: 'acme',
      protocol: 'cxml',
    })

    expect(payload).not.toHaveProperty('shared_secret')
    expect(payload).not.toHaveProperty('oci_password')
    expect(payload.protocol).toBe('cxml')
  })

  it('omits empty numeric limits so tenant defaults apply', () => {
    const payload = buildPunchoutBuyerPayload({
      ...EMPTY_BUYER_FORM,
      name: 'Acme',
      code: 'acme',
      maxLineItems: '',
      maxQuantityPerLine: '',
    })

    expect(payload.settings).not.toHaveProperty('max_line_items')
    expect(payload.settings).not.toHaveProperty('max_quantity_per_line')
  })
})
