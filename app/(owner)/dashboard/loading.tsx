export default function DashboardLoading() {
  return (
    <div className="p-4 lg:p-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-6 space-y-2">
        <div className="h-4 w-32 bg-[#111811] border border-[#1A211A] rounded" />
        <div className="h-8 w-48 bg-[#111811] border border-[#1A211A] rounded" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#111811] border border-[#1A211A] rounded-2xl p-4 h-[106px] flex flex-col justify-between">
            <div className="h-3 w-16 bg-[#151E15] rounded" />
            <div className="h-6 w-24 bg-[#151E15] rounded" />
            <div className="h-3 w-12 bg-[#151E15] rounded" />
          </div>
        ))}
      </div>

      {/* Lower Cards Skeleton */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 h-[280px]" />
        <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 h-[280px]" />
      </div>
    </div>
  )
}
