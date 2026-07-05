'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Sale } from '@/types'
import { formatNaira } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export function RealtimeSalesFeed({ initialSales }: { initialSales: Sale[] }) {
  const [sales, setSales] = useState<Sale[]>(
    initialSales.slice(0, 10)
  )
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime-sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        async (payload: any) => {
          // Fetch full sale with joins
          const { data } = await supabase
            .from('sales')
            .select('*, products(name), staff_members(name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setSales(prev => [data as any, ...prev.slice(0, 9)])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  return (
    <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[#FFFFFF] font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
          Live Sales Feed
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse" />
          <span className="text-[#A1A8A1] text-xs">Live</span>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[#6B726B] text-sm">No sales logged today yet</p>
          <p className="text-[#6B726B] text-xs mt-1">Sales appear here the moment staff log them</p>
        </div>
      ) : (
        <div className="space-y-0">
          {sales.map((sale, i) => (
            <div
              key={sale.id}
              className={`flex items-center justify-between py-3 ${
                i < sales.length - 1 ? 'border-b border-[#1A221A]' : ''
              }`}
            >
              <div>
                <p className="text-[#FFFFFF] text-sm font-medium">
                  {(sale as any).products?.name}
                  <span className="text-[#A1A8A1] font-normal"> × {sale.qty_sold}</span>
                </p>
                <p className="text-[#6B726B] text-xs mt-0.5">
                  {(sale as any).staff_members?.name} ·{' '}
                  {formatDistanceToNow(new Date(sale.logged_at), { addSuffix: true })}
                </p>
              </div>
              <p className="text-[#00C853] font-semibold text-sm"
                 style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatNaira(sale.total)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
