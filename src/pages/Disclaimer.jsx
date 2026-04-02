export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-semibold text-gray-800 mb-8">Disclaimer</h1>
        <div className="bg-white rounded-3xl p-8 border border-[#FFE5D9]/50 space-y-5 text-gray-600 leading-relaxed">
          <div className="flex gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200"><span className="text-2xl">⚠️</span><p className="text-amber-800 font-medium">YourSeha is a wellness and support platform. It is not a licensed medical provider or psychiatric facility.</p></div>
          <p>The resources, articles, and content available on YourSeha are intended for informational and educational purposes only. They do not constitute medical advice, diagnosis, or treatment.</p>
          <p>Psychologist profiles and sessions facilitated through YourSeha are provided by independent licensed professionals. YourSeha does not employ these professionals and is not responsible for the advice given during sessions.</p>
          <p>If you or someone you know is experiencing a mental health crisis, please contact emergency services immediately:</p>
          <div className="bg-[#FFF8F6] rounded-2xl p-4 border border-[#FFE5D9]">
            <p className="font-semibold text-gray-800">Qatar Emergency Contacts</p>
            <p>General Emergency: <span className="text-[#E8907C] font-bold">999</span></p>
            <p>Mental Health Hotline (Hamad): <span className="text-[#E8907C] font-bold">16000</span></p>
            <p>General Healthcare: <span className="text-[#E8907C] font-bold">16060</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
