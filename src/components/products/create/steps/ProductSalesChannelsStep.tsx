import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import { Check, Globe2, Handshake, Loader2, Plug, ShoppingBag, Store } from 'lucide-react'
import { type SalesChannelOption, salesChannelsApi } from '@/api/salesChannels'

interface Props {
  data: { channelCodes: string[] }
  onChange: (data: { channelCodes: string[] }) => void
}

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  storefront: Store,
  punchout: Handshake,
  marketplace: ShoppingBag,
  api: Plug,
}

function ChannelCard({
  channel,
  active,
  onToggle,
}: {
  channel: SalesChannelOption
  active: boolean
  onToggle: () => void
}) {
  const Icon = CHANNEL_ICONS[channel.code] ?? Globe2

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        active
          ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500 dark:border-sky-500 dark:bg-sky-900/20'
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active
            ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block font-medium text-sm ${
            active ? 'text-sky-800 dark:text-sky-200' : 'text-gray-800 dark:text-gray-200'
          }`}
        >
          {channel.name}
        </span>
        <span className="mt-0.5 block text-gray-500 text-xs dark:text-gray-400">
          {channel.description ?? channel.code}
        </span>
      </span>

      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          active ? 'border-sky-600 bg-sky-600 text-white' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {active ? <Check className="h-3 w-3" /> : null}
      </span>
    </button>
  )
}

export function ProductSalesChannelsStep({ data, onChange }: Props) {
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['sales-channels'],
    queryFn: () => salesChannelsApi.list(),
    staleTime: 30 * 60 * 1000,
  })

  const toggle = (code: string) => {
    const channelCodes = data.channelCodes.includes(code)
      ? data.channelCodes.filter((existing) => existing !== code)
      : [...data.channelCodes, code]

    onChange({ channelCodes })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
          <Globe2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Sales Channels</h2>
          <p className="text-gray-500 text-sm dark:text-gray-400">
            Choose where this product is published
          </p>
        </div>
      </div>

      <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-800 text-xs dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
        Products are only visible in the channels selected here. Punchout catalogs always require an
        explicit selection.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          No sales channels are configured. Ask an administrator to seed the sales channel table.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.code}
              channel={channel}
              active={data.channelCodes.includes(channel.code)}
              onToggle={() => toggle(channel.code)}
            />
          ))}
        </div>
      )}

      {!isLoading && channels.length > 0 && data.channelCodes.length === 0 ? (
        <p className="text-amber-600 text-xs dark:text-amber-400">
          Select at least one sales channel to continue.
        </p>
      ) : null}
    </div>
  )
}
