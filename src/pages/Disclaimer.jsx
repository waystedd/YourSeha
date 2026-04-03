import { qatarEmergencyContacts } from '@/lib/qatarSupport'

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-12">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800 mb-2">Disclaimer</h1>
          <p className="text-gray-500">Placeholder legal copy — replace with your final approved text before launch.</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-[#FFE5D9]/50 space-y-5 text-gray-600 leading-relaxed">
          <div className="flex gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <span className="text-2xl">⚠️</span>
            <p className="text-amber-800 font-medium">YourSeha is a wellness and support platform. It is not a hospital, emergency provider, or substitute for direct medical care.</p>
          </div>

          <p>
            The resources, articles, community discussions, and journaling tools available on YourSeha are provided for general education and support.
            They should not be used as a diagnosis, treatment plan, or emergency instruction.
          </p>

          <p>
            Psychologist profiles and appointments facilitated through YourSeha are offered by independent professionals. YourSeha provides the platform experience,
            but the professional advice and session outcomes remain the responsibility of the individual practitioner and user.
          </p>

          <p>
            If you believe there is any immediate risk to life, safety, or urgent medical harm, contact emergency services right away.
          </p>

          <div className="bg-[#FFF8F6] rounded-2xl p-4 border border-[#FFE5D9] space-y-3">
            <p className="font-semibold text-gray-800">Qatar emergency contacts</p>
            {qatarEmergencyContacts.map((contact) => (
              <div key={contact.id}>
                <p>
                  <span className="font-medium text-gray-800">{contact.title}: </span>
                  <span className="text-[#E8907C] font-bold">{contact.number}</span>
                </p>
                <p className="text-xs text-gray-500">{contact.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
