import { Link, useLocation } from "wouter";
import { BookOpen, FileText, MessageCircle, User, Menu, Bell, LogOut, Sparkles, Video } from "lucide-react";
import { API_BASE_URL } from '@/lib/api-config';
import { clearAuthData, getAuthToken } from '@/lib/auth-utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleLearningPathsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Check if we're on the dashboard
    if (location === '/dashboard' || location === '/') {
      // Scroll to learning paths section
      setTimeout(() => {
        const section = document.getElementById('learning-paths-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    } else {
      // Navigate to dashboard first
      setLocation('/dashboard');
      // Wait for navigation and page load, then scroll
      setTimeout(() => {
        const section = document.getElementById('learning-paths-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // If section not found, try again after a longer delay
          setTimeout(() => {
            const section = document.getElementById('learning-paths-section');
            if (section) {
              section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 500);
        }
      }, 300);
    }
  };

  const navItems = [
    { path: "/learning-paths", label: "Learning Paths", icon: BookOpen, onClick: handleLearningPathsClick },
    { path: "/edu-ott", label: "EduOTT", icon: Video },
    { path: "/student-exams", label: "Exams", icon: FileText },
    { path: "/ai-tutor", label: "Vidya AI", icon: MessageCircle },
  ];

  const NavContent = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;
        
        if (item.onClick) {
          return (
            <Button
              key={item.path}
              variant="ghost"
              onClick={item.onClick}
              className={`w-full justify-start rounded-xl transition-all duration-300 group ${
                isActive 
                  ? "bg-gradient-to-r from-sky-300 to-teal-400 text-white shadow-lg scale-105" 
                  : "text-gray-700 hover:bg-gradient-to-r hover:from-sky-50 hover:to-teal-50 hover:text-sky-700 hover:scale-105"
              }`}
            >
              <Icon className={`w-4 h-4 mr-3 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="font-medium">{item.label}</span>
            </Button>
          );
        }
        
        return (
          <Link key={item.path} href={item.path}>
            <Button
              variant="ghost"
              className={`w-full justify-start rounded-xl transition-all duration-300 group ${
                isActive 
                  ? "bg-gradient-to-r from-sky-300 to-teal-400 text-white shadow-lg scale-105" 
                  : "text-gray-700 hover:bg-gradient-to-r hover:from-sky-50 hover:to-teal-50 hover:text-sky-700 hover:scale-105"
              }`}
            >
              <Icon className={`w-4 h-4 mr-3 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="font-medium">{item.label}</span>
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop Header - Modern Gradient Theme */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-b border-blue-200/40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Section - Enhanced */}
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <div className="flex items-center space-x-3 cursor-pointer group">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-1 group-hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                      <img 
                        src="/logo.jpg" 
                        alt="ASLILEARN Logo" 
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                      ASLILEARN AI
                    </span>
                    <span className="text-xs text-gray-600 font-medium -mt-1">AI-Powered Learning</span>
                  </div>
                </div>
              </Link>
            </div>
            
            {/* Navigation Links - Modern Design */}
            {!isMobile && (
              <div className="hidden md:flex items-center space-x-1 bg-white/50 backdrop-blur-md rounded-full p-1.5 border border-blue-100/50 shadow-lg">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  if (item.onClick) {
                    return (
                      <button
                        key={item.path}
                        onClick={item.onClick}
                        className={`relative px-5 py-2.5 rounded-full transition-all duration-300 flex items-center space-x-2 group ${
                          isActive 
                            ? "bg-gradient-to-r from-sky-300 to-teal-400 text-white shadow-lg scale-105" 
                            : "text-gray-700 hover:bg-gradient-to-r hover:from-sky-50 hover:to-teal-50 hover:text-sky-700"
                        }`}
                      >
                        <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <span className="font-medium text-sm">{item.label}</span>
                        {isActive && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                        )}
                      </button>
                    );
                  }
                  return (
                    <Link key={item.path} href={item.path}>
                      <button className={`relative px-5 py-2.5 rounded-full transition-all duration-300 flex items-center space-x-2 group ${
                        isActive 
                          ? "bg-gradient-to-r from-sky-300 to-teal-400 text-white shadow-lg scale-105" 
                          : "text-gray-700 hover:bg-gradient-to-r hover:from-sky-50 hover:to-teal-50 hover:text-sky-700"
                      }`}>
                        <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <span className="font-medium text-sm">{item.label}</span>
                        {isActive && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                        )}
                      </button>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right Section - Enhanced */}
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="icon"
                className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 backdrop-blur-sm border border-blue-200/50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 relative group"
              >
                <Bell className="w-5 h-5 text-blue-700 group-hover:animate-pulse" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </Button>
              
              {isMobile ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 backdrop-blur-sm border border-blue-200/50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110"
                    >
                      <Menu className="w-5 h-5 text-blue-700" />
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
                            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
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
                          <LogOut className="w-4 h-4 mr-3" />
                          {isLoggingOut ? "Logging out..." : "Logout"}
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link href="/profile">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg backdrop-blur-sm border-2 border-white hover:scale-110 transition-transform duration-300 hover:shadow-xl group">
                      <span className="text-sm font-semibold text-white group-hover:scale-110 transition-transform">AK</span>
                    </div>
                  </Link>
                  <Button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    variant="ghost"
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 text-red-600 backdrop-blur-sm border border-red-300/30 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 font-medium"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Modern Design */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-white/90 border-t border-blue-200/30 shadow-2xl z-50">
          <div className="grid grid-cols-5 py-2 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              if (item.onClick) {
                return (
                  <button
                    key={item.path}
                    onClick={item.onClick}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-300 relative group ${
                      isActive 
                        ? "bg-gradient-to-r from-sky-300 to-teal-400 text-white shadow-lg scale-105" 
                        : "text-gray-700 hover:bg-gradient-to-r hover:from-sky-50 hover:to-teal-50 hover:text-sky-700"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
                    {isActive && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                    )}
                  </button>
                );
              }
              
              return (
                <Link key={item.path} href={item.path}>
                  <button className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-300 relative group ${
                    isActive 
                      ? "bg-gradient-to-r from-sky-300 to-teal-400 text-white shadow-lg scale-105" 
                      : "text-gray-700 hover:bg-gradient-to-r hover:from-sky-50 hover:to-teal-50 hover:text-sky-700"
                  }`}>
                    <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
                    {isActive && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                    )}
                  </button>
                </Link>
              );
            })}
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-300 ${
                isLoggingOut 
                  ? "bg-red-500/20 text-red-600" 
                  : "text-gray-700 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <LogOut className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

    </>
  );
}
