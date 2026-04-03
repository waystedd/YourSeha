import { Link } from 'react-router-dom'
import { createPageUrl } from '@/utils'

export default function PageNotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-3xl border border-[#FFE5D9] bg-white shadow-sm p-6 text-center">
        <div className="text-6xl font-semibold text-gray-900">404</div>
        <div className="mt-2 text-gray-700 font-medium">Page not found</div>
        <div className="mt-2 text-sm text-gray-600">
          The page you’re looking for doesn’t exist (yet).
        </div>
        <Link
          className="inline-flex mt-6 items-center justify-center rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] px-4 py-2 text-white font-medium hover:opacity-90"
          to={createPageUrl('Home')}
        >
          Go home
        </Link>
      </div>
    </div>
  )
}

