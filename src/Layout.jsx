import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createPageUrl } from '@/utils'
import { base44 } from '@/api/base44Client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Home,
  Users,
  UserCircle,
  BookOpen,
  PenLine,
  Bell,
  AlertTriangle,
  Menu,
  ChevronDown,
  Globe,
  MessageCircle,
  BarChart2,
  Calendar,
  Settings,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import AIHealthBot from '@/components/AIHealthBot'
import DailyCheckIn from '@/components/DailyCheckIn'
import { LanguageProvider, useLanguage } from '@/components/LanguageContext'
import { toast } from 'sonner'

const PUBLIC_PAGES = new Set([
  'SignIn',
  'VerifyEmail',
  'RoleSelection',
  'AboutCareco',
  'PrivacyPolicy',
  'Disclaimer',
  'Contact',
  'TermsOfService',
])

function LayoutInner({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { language, setLanguage, t, isRTL } = useLanguage()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me()
      } catch {
        return null
      }
    },
  })

  const handleLogout = async () => {
    await base44.auth.logout()
    queryClient.setQueryData(['currentUser'], null)
    queryClient.clear()
    navigate(createPageUrl('SignIn'))
  }

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.filter({ is_read: false }, '-created_date', 20),
    enabled: !!user,
  })

  const isPsychologist = user?.role === 'psychologist'
  const isPublicPage = PUBLIC_PAGES.has(currentPageName)

  useEffect(() => {
    const allowed = ['/EditProfile', '/SignIn', '/RoleSelection', '/VerifyEmail']
    if (!user || !isPsychologist) return
    if (user.onboarding_completed) return
    if (allowed.includes(location.pathname)) return
    toast.info('Please complete your professional profile to continue')
    navigate(createPageUrl('EditProfile'))
  }, [user, isPsychologist, location.pathname, navigate])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const caregiverNavItems = useMemo(() => ([
    { nameKey: 'nav_home', page: 'Home', icon: Home },
    { nameKey: 'nav_dashboard', page: 'WellnessDashboard', icon: BarChart2 },
    { nameKey: 'nav_community', page: 'Community', icon: Users },
    { nameKey: 'nav_psychologists', page: 'Psychologists', icon: UserCircle },
    { nameKey: 'nav_resources', page: 'Resources', icon: BookOpen },
    { nameKey: 'nav_journaling', page: 'Journaling', icon: PenLine },
    { nameKey: 'nav_reminders', page: 'Reminders', icon: Bell },
    { nameKey: 'nav_emergency', page: 'Emergency', icon: AlertTriangle },
    { name: 'Messages', page: 'Inbox', icon: MessageCircle },
  ]), [])

  const psychologistNavItems = useMemo(() => ([
    { name: 'Dashboard', page: 'PsychologistDashboard', icon: BarChart2 },
    { name: 'Appointments', page: 'PsychologistAppointments', icon: Calendar },
    { name: 'Patients', page: 'PsychologistPatients', icon: Users },
    { name: 'Resources', page: 'PsychologistResources', icon: BookOpen },
    { name: 'Community', page: 'Community', icon: MessageCircle },
    { name: 'Messages', page: 'Inbox', icon: Mail },
    { name: 'Profile', page: 'Profile', icon: UserCircle },
  ]), [])

  const navItems = user ? (isPsychologist ? psychologistNavItems : caregiverNavItems) : []
  const showDailyCheckIn = !!user && user.role !== 'psychologist' && !['SignIn', 'RoleSelection', 'VerifyEmail'].includes(currentPageName)
  const logoTarget = !user ? createPageUrl('SignIn') : isPsychologist ? createPageUrl('PsychologistDashboard') : createPageUrl('WellnessDashboard')

  useEffect(() => {
    if (!user) return undefined
    const unsubscribe = base44.entities.Notification.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
    return () => unsubscribe?.()
  }, [user, queryClient])

  return (
    <div className={`min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`
        :root { --coral: #F4A896; --coral-light: #FFDDD2; --coral-dark: #E8907C; }
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
      `}</style>

      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#FFE5D9]/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            <Link to={logoTarget} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F4A896] to-[#E8907C] flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-base">Y</span>
              </div>
              <span className="text-lg font-semibold text-gray-800">YourSeha</span>
            </Link>

            {navItems.length > 0 ? (
              <div className="hidden lg:flex items-center gap-0.5">
                {navItems.map((item) => (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      currentPageName === item.page
                        ? 'text-[#E8907C] bg-[#FFF8F6]'
                        : 'text-gray-600 hover:text-[#E8907C] hover:bg-[#FFF8F6]'
                    }`}
                  >
                    {item.nameKey ? t(item.nameKey) : item.name}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="hidden lg:block flex-1" />
            )}

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="rounded-xl text-gray-600 hover:text-[#E8907C] hover:bg-[#FFF8F6] text-xs"
              >
                <Globe className="w-4 h-4 mr-1" />
                {t('lang_switch')}
              </Button>

              {user ? (
                <>
                  <Link to={createPageUrl('Inbox')}>
                    <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-[#FFF8F6]">
                      <Mail className="w-5 h-5 text-gray-600" />
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-[#FFF8F6]">
                        <Bell className="w-5 h-5 text-gray-600" />
                        {notifications.length > 0 ? (
                          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-[#F4A896] text-white text-xs">
                            {notifications.length}
                          </Badge>
                        ) : null}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 rounded-2xl border-[#FFE5D9]">
                      <div className="p-3 border-b border-[#FFE5D9]">
                        <h3 className="font-semibold text-gray-800">{t('notifications')}</h3>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">{t('no_notifications')}</div>
                      ) : (
                        notifications.slice(0, 5).map((notif) => (
                          <DropdownMenuItem key={notif.id} className="p-3 cursor-pointer">
                            <div>
                              <p className="font-medium text-sm">{notif.title}</p>
                              <p className="text-xs text-gray-500">{notif.message}</p>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFD9C0] to-[#F9C6B8] flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                          {user?.profile_photo ? (
                            <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-medium text-sm">{user?.full_name?.charAt(0) || 'U'}</span>
                          )}
                        </div>
                        <span className="hidden md:block text-sm font-medium text-gray-700">
                          {user?.full_name?.split(' ')[0] || 'Guest'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-500 hidden md:block" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-2xl border-[#FFE5D9]">
                      {isPsychologist ? (
                        <>
                          <Link to={createPageUrl('PsychologistDashboard')}>
                            <DropdownMenuItem className="cursor-pointer">
                              <BarChart2 className="w-4 h-4 mr-2" /> Dashboard
                            </DropdownMenuItem>
                          </Link>
                          <Link to={createPageUrl('EditProfile')}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Settings className="w-4 h-4 mr-2" /> Edit Profile
                            </DropdownMenuItem>
                          </Link>
                          <Link to={createPageUrl('Inbox')}>
                            <DropdownMenuItem className="cursor-pointer">
                              <MessageCircle className="w-4 h-4 mr-2" /> Messages
                            </DropdownMenuItem>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link to={createPageUrl('Community')}>
                            <DropdownMenuItem className="cursor-pointer">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              {t('profile_my_posts')}
                            </DropdownMenuItem>
                          </Link>
                          <Link to={createPageUrl('Appointments')}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Bell className="w-4 h-4 mr-2" />
                              {t('profile_appointments')}
                            </DropdownMenuItem>
                          </Link>
                          <Link to={createPageUrl('EditProfile')}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Settings className="w-4 h-4 mr-2" /> Edit Profile
                            </DropdownMenuItem>
                          </Link>
                          <Link to={createPageUrl('Inbox')}>
                            <DropdownMenuItem className="cursor-pointer">
                              <MessageCircle className="w-4 h-4 mr-2" /> Messages
                            </DropdownMenuItem>
                          </Link>
                          <Link to={createPageUrl('Profile')}>
                            <DropdownMenuItem className="cursor-pointer">
                              <UserCircle className="w-4 h-4 mr-2" />
                              {t('profile_settings')}
                            </DropdownMenuItem>
                          </Link>
                        </>
                      )}
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {t('profile_logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Link
                  to={createPageUrl('SignIn')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] hover:opacity-90 transition-opacity"
                >
                  <span className="text-white text-sm font-medium">Sign In</span>
                </Link>
              )}

              {navItems.length > 0 ? (
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden rounded-xl hover:bg-[#FFF8F6]">
                      <Menu className="w-5 h-5 text-gray-600" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side={isRTL ? 'left' : 'right'} className="w-72 bg-white border-[#FFE5D9]">
                    <div className="flex flex-col gap-2 mt-8">
                      {navItems.map((item) => (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            currentPageName === item.page
                              ? 'text-[#E8907C] bg-[#FFF8F6]'
                              : 'text-gray-600 hover:text-[#E8907C] hover:bg-[#FFF8F6]'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.nameKey ? t(item.nameKey) : item.name}
                        </Link>
                      ))}
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false)
                          handleLogout()
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all text-left"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        {t('profile_logout')}
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      {showDailyCheckIn ? <DailyCheckIn /> : null}

      <main className={`min-h-[calc(100vh-4rem-8rem)] ${isPublicPage ? 'pb-2' : ''}`}>
        {children}
      </main>

      <AIHealthBot />

      <footer className="bg-white border-t border-[#FFE5D9]/50 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
            <Link to={createPageUrl('AboutCareco')} className="text-gray-600 hover:text-[#E8907C] transition-colors">{t('footer_about')}</Link>
            <Link to={createPageUrl('PrivacyPolicy')} className="text-gray-600 hover:text-[#E8907C] transition-colors">{t('footer_privacy')}</Link>
            <Link to={createPageUrl('Disclaimer')} className="text-gray-600 hover:text-[#E8907C] transition-colors">{t('footer_disclaimer')}</Link>
            <Link to={createPageUrl('Contact')} className="text-gray-600 hover:text-[#E8907C] transition-colors">{t('footer_contact')}</Link>
            <Link to={createPageUrl('TermsOfService')} className="text-gray-600 hover:text-[#E8907C] transition-colors">{t('footer_terms')}</Link>
          </div>
          <div className="mt-6 pt-6 border-t border-[#FFE5D9]/50 text-center text-gray-500 text-sm">
            <p>{t('footer_copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function Layout({ children, currentPageName }) {
  return (
    <LanguageProvider>
      <LayoutInner currentPageName={currentPageName}>{children}</LayoutInner>
    </LanguageProvider>
  )
}
