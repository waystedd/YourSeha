export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-semibold text-gray-800 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: April 2026</p>
        <div className="bg-white rounded-3xl p-8 border border-[#FFE5D9]/50 space-y-6 text-gray-600 leading-relaxed">
          <section><h2 className="text-lg font-semibold text-gray-800 mb-2">1. Data We Collect</h2><p>We collect information you provide directly (name, email, profile details), usage data, and information from connected services such as Google OAuth. We never sell your personal data to third parties.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-800 mb-2">2. How We Use Your Data</h2><p>Your data is used to provide and improve our services, personalise your experience, send you relevant notifications, and connect you with psychologists. Journal entries and mood logs are private and visible only to you.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-800 mb-2">3. Data Security</h2><p>All data is encrypted in transit (HTTPS) and at rest. We use Supabase for secure database hosting with row-level security policies. Only you can access your private data.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-800 mb-2">4. Your Rights</h2><p>You may request access to, correction of, or deletion of your personal data at any time by contacting us. You can delete your account from the Settings page.</p></section>
          <section><h2 className="text-lg font-semibold text-gray-800 mb-2">5. Contact</h2><p>For privacy-related inquiries: <span className="text-[#E8907C]">privacy@yourseha.qa</span></p></section>
        </div>
      </div>
    </div>
  )
}
