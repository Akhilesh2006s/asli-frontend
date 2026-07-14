import { Link, useLocation } from "wouter";
import { BookOpen, FileText, MessageCircle, User, Menu, LogOut, Sparkles, Video } from "lucide-react";
import { API_BASE_URL } from '@/lib/api-config';
import { clearAuthData, getAuthToken, getUser, setUser } from '@/lib/auth-utils';
import { fetchAuthUser } from '@/lib/auth-session';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";

const NAV_INITIALS_KEY = 'aslilearn_nav_initials';

function initialsFromName(name: string | undefined | null): string {
  if (!name || !String(name).trim()) return '';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.map((n) => n[0]).join('').toUpperCase().slice(0, 3);
}

function initialsFromUser(user: any): string {
  if (!user) return '';
  return initialsFromName(user.fullName || user.name);
}

function initialsFromEmail(email: string | undefined | null): string {
  if (!email || !email.includes('@')) return '';
  const local = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  if (local.length === 1) return local.toUpperCase();
  return '';
}

/** Sync read so avatar does not flash "U" when Navigation remounts on route change. */
function readInitialsForNav(): string {
  try {
    const cached = sessionStorage.getItem(NAV_INITIALS_KEY);
    if (cached && cached.trim()) return cached.trim().slice(0, 3);
  } catch {
    /* ignore */
  }
  const fromStoredUser = initialsFromUser(getUser());
  if (fromStoredUser) return fromStoredUser;
  try {
    return initialsFromEmail(localStorage.getItem('userEmail'));
  } catch {
    return '';
  }
}

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userInitials, setUserInitials] = useState<string>(() => readInitialsForNav());

  useEffect(() => {
    const fetchUser = async () => {
      const token = getAuthToken();
      if (!token) {
        setUserInitials('');
        try {
          sessionStorage.removeItem(NAV_INITIALS_KEY);
        } catch {
          /* ignore */
        }
        return;
      }
      try {
        const user = await fetchAuthUser();
        if (user && typeof user === 'object') {
          try {
            setUser(user);
          } catch {
            /* ignore */
          }
          const next =
            initialsFromName((user as { fullName?: string; name?: string }).fullName || (user as { name?: string }).name) ||
            initialsFromEmail((user as { email?: string }).email) ||
            readInitialsForNav();
          setUserInitials(next);
          if (next) {
            try {
              sessionStorage.setItem(NAV_INITIALS_KEY, next);
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        setUserInitials(readInitialsForNav());
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = getAuthToken();
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Logout API error:', error);
          // Continue with logout even if API call fails
        }
      }
      
      // Clear all authentication data
      clearAuthData();
      
      // Redirect to login page
      setLocation('/signin');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear storage and redirect even on error
      clearAuthData();
      setLocation('/signin');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const prefetchStudentRoute = (path: string) => {
    switch (path) {
      case "/learning-paths":
        void import("@/pages/learning-paths");
        break;
      case "/edu-ott":
        void import("@/pages/edu-ott");
        break;
      case "/student-exams":
        void import("@/pages/student-exams");
        break;
      case "/ai-tutor":
        void import("@/pages/ai-tutor");
        break;
      default:
        break;
    }
  };

  const navItems = [
    { path: "/learning-paths", label: "Learning Paths", icon: BookOpen },
    { path: "/edu-ott", label: "EduOTT", icon: Video },
    { path: "/student-exams", label: "Exams", icon: FileText },
    { path: "/ai-tutor", label: "Vidya AI", icon: MessageCircle },
  ];

  const getCompactLabel = (label: string) => {
    if (label === "Learning Paths") return "Learning";
    if (label === "Vidya AI") return "Vidya";
    return label;
  };

  const NavContent = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;

        return (
          <Link key={item.path} href={item.path}>
            <Button
              onMouseEnter={() => prefetchStudentRoute(item.path)}
              onFocus={() => prefetchStudentRoute(item.path)}
              variant="ghost"
              className={`w-full justify-start rounded-xl transition-all duration-300 group ${
                isActive 
                  ? "bg-gradient-to-r from-sky-300 to-teal-400 text-white shadow-lg scale-105" 
                  : "text-gray-700 hover:bg-gradient-to-r hover:from-sky-50 hover:to-teal-50 hover:text-sky-700 hover:scale-105"
              }`}
            >
              <Icon className={`mr-3 h-5 w-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="text-base font-semibold">{item.label}</span>
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop Header - Modern Gradient Theme */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-ink/10 bg-white/85 shadow-elevated backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between sm:h-22">
            {/* Logo Section - simplified, no border around logo */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/dashboard">
                <div className="group flex min-w-0 cursor-pointer items-center gap-3">
                  <img 
                    src="/logo.jpg" 
                    alt="ASLILEARN Logo" 
                    className="h-12 w-12 shrink-0 rounded-xl object-contain transition-transform duration-300 group-hover:scale-105 sm:h-14 sm:w-14"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
                      ASLILEARN<span className="text-primary"> AI</span>
                    </span>
                    <span className="hidden text-base font-medium text-muted-foreground xl:block">AI-Powered Learning</span>
                  </div>
                </div>
              </Link>
            </div>
            
            {/* Navigation Links - Modern Design */}
            {!isMobile && (
              <div className="hidden items-center gap-1 rounded-full border border-ink/10 bg-mist/80 p-1.5 shadow-sm backdrop-blur-md md:flex">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;

                  return (
                    <Link key={item.path} href={item.path}>
                      <button
                        onMouseEnter={() => prefetchStudentRoute(item.path)}
                        onFocus={() => prefetchStudentRoute(item.path)}
                        className={`relative flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-semibold transition-all duration-300 lg:px-5 lg:py-3 ${
                        isActive 
                          ? "bg-gradient-to-r from-teal-green-600 to-indigo-blue-600 text-white shadow-glow" 
                          : "text-ink/80 hover:bg-white hover:text-primary"
                      }`}>
                        <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <span>{getCompactLabel(item.label)}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right Section - Enhanced */}
            <div className="flex items-center space-x-3">
              {isMobile ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 backdrop-blur-sm border border-blue-200/50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110"
                    >
                      <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72 bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/30 backdrop-blur-xl border-l border-blue-200/30">
                    <div className="flex flex-col space-y-3 mt-8">
                      {/* Mobile Logo */}
                      <Link href="/dashboard">
                        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-blue-200/30 cursor-pointer hover:opacity-80 transition-opacity">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-1">
                            <div className="w-full h-full rounded-lg bg-white flex items-center justify-center overflow-hidden">
                              <img 
                                src="/logo.jpg" 
                                alt="ASLILEARN Logo" 
                                className="w-full h-full object-contain p-1"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                              ASLILEARN AI
                            </span>
                            <span className="text-xs text-gray-600 font-medium">AI-Powered Learning</span>
                          </div>
                        </div>
                      </Link>
                      <NavContent />
                      <div className="pt-4 border-t border-blue-200/30">
                        <Button 
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          variant="ghost"
                          className="w-full justify-start text-red-600 hover:bg-red-50/50 rounded-xl transition-all duration-300"
                        >
                          <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-3" />
                          {isLoggingOut ? "Logging out..." : "Logout"}
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : (
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <Link href="/profile">
                    <div className="w-10 h-10 lg:w-11 lg:h-11 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg backdrop-blur-sm border-2 border-white hover:scale-110 transition-transform duration-300 hover:shadow-xl group">
                      {userInitials ? (
                        <span className="text-xs lg:text-sm font-semibold text-white group-hover:scale-110 transition-transform">
                          {userInitials}
                        </span>
                      ) : (
                        <User className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white opacity-95" aria-hidden />
                      )}
                    </div>
                  </Link>
                  <Button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    variant="ghost"
                    className="px-3 lg:px-5 py-2 lg:py-2.5 rounded-full bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 text-red-600 backdrop-blur-sm border border-red-300/30 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 font-medium"
                  >
                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4 lg:mr-2" />
                    <span className="hidden lg:inline">{isLoggingOut ? "Logging out..." : "Logout"}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

    </>
  );
}
