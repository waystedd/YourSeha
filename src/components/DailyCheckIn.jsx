export default function DailyCheckIn() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="rounded-3xl border border-[#FFE5D9] bg-white/80 backdrop-blur px-5 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="font-semibold text-gray-900">Daily Check‑In</div>
            <div className="text-sm text-gray-600">Placeholder component.</div>
          </div>
          <div className="text-sm text-gray-700">
            Status: <span className="font-medium text-[#E8907C]">Not connected</span>
          </div>
        </div>
      </div>
    </div>
  )
}

