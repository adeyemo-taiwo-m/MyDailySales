import { formatNaira } from '@/lib/utils'

interface StaffSummary {
  name: string
  total: number
  count: number
}

export function StaffBreakdown({ breakdown }: { breakdown: StaffSummary[] }) {
  const maxTotal = Math.max(...breakdown.map(s => s.total), 1)

  return (
    <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 shadow-card">
      <h2 className="text-[#FFFFFF] font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>
        Staff Today
      </h2>

      {breakdown.length === 0 ? (
        <p className="text-[#6B726B] text-sm text-center py-6">No sales logged yet</p>
      ) : (
        <div className="space-y-4">
          {breakdown.map(staff => (
            <div key={staff.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[#FFFFFF] text-sm font-medium">{staff.name}</span>
                <div className="text-right">
                  <span className="text-[#00C853] font-semibold text-sm"
                        style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatNaira(staff.total)}
                  </span>
                  <span className="text-[#6B726B] text-xs ml-2">{staff.count} sales</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-[#151E15] rounded-full overflow-hidden border border-[#1A211A]">
                <div
                  className="h-full bg-[#00C853] rounded-full transition-all duration-700"
                  style={{ width: `${(staff.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
