export default function UserNotRegisteredError() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-3xl border border-[#FFE5D9] bg-white shadow-sm p-6">
        <h1 className="text-xl font-semibold text-gray-900">Account not registered</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your account isn’t registered in this environment yet.
        </p>
      </div>
    </div>
  )
}

