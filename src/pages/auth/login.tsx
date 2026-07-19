import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Sparkles, Zap, BookOpen, GraduationCap } from 'lucide-react';
import { Link } from 'wouter';
import { API_BASE_URL } from '@/lib/api-config';
import { setAuthToken, setUser } from '@/lib/auth-utils';
import { prepareClientForNewLogin } from '@/lib/client-cache-reset';
import { fetchDashboardBootstrap } from '@/lib/dashboard-bootstrap';

const LOGIN_INTRO_KEY = 'aslilearn_skip_login_intro';

const Login = () => {
  const [, setLocation] = useLocation();
  const [showVideo, setShowVideo] = useState(() => {
    try {
      return localStorage.getItem(LOGIN_INTRO_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const [showSignInForm, setShowSignInForm] = useState(() => {
    try {
      return localStorage.getItem(LOGIN_INTRO_KEY) === '1';
    } catch {
      return true;
    }
  });
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Short intro on first visit only (~0.8s); returning users see the form immediately
  useEffect(() => {
    try {
      if (localStorage.getItem(LOGIN_INTRO_KEY) === '1') return;
    } catch {
      setShowVideo(false);
      setShowSignInForm(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowVideo(false);
      setTimeout(() => setShowSignInForm(true), 200);
      try {
        localStorage.setItem(LOGIN_INTRO_KEY, '1');
      } catch {
        /* ignore */
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const LOGIN_TIMEOUT_MS = 25_000;

    const attemptLogin = async (): Promise<Response> => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
      try {
        return await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(formData),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timer);
      }
    };

    const isRealNetworkFailure = (err: unknown) => {
      const msg = String((err as Error)?.message || err || '').toLowerCase();
      // fetch() only throws for transport failures (offline, DNS, connection reset, CORS block).
      return (
        err instanceof TypeError ||
        msg.includes('failed to fetch') ||
        msg.includes('networkerror') ||
        msg.includes('load failed') ||
        msg.includes('err_connection') ||
        msg.includes('err_network')
      );
    };

    try {
      let response: Response;
      try {
        response = await attemptLogin();
      } catch (firstErr) {
        // One retry only for genuine transport failures (brief DB/server blip).
        if (!isRealNetworkFailure(firstErr)) throw firstErr;
        await new Promise((r) => setTimeout(r, 1200));
        response = await attemptLogin();
      }

      let data: { message?: string; token?: string; user?: { role?: string; email?: string } } = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          setError(
            response.ok
              ? 'Login failed. Invalid response from server.'
              : `Login failed (server error ${response.status}). Please try again.`,
          );
          return;
        }
      } else {
        setError(
          response.status === 503
            ? 'Server is starting up. Please wait a few seconds and try again.'
            : `Login failed (server error ${response.status || 'unknown'}). Please try again.`,
        );
        return;
      }

      if (response.ok) {
        prepareClientForNewLogin();

        if (data.token) {
          setAuthToken(data.token);
        }
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('userRole', data.user.role || '');
          localStorage.setItem('userEmail', data.user.email || '');
        }
        if (data.user?.role === 'super-admin') {
          setLocation('/super-admin/dashboard');
        } else if (data.user?.paymentRequired && data.user?.isIndividualAccount) {
          setLocation('/auth/subscribe');
        } else if (data.user?.role === 'admin') {
          setLocation('/admin/dashboard');
        } else if (data.user?.role === 'teacher') {
          setLocation('/teacher/dashboard');
        } else {
          void fetchDashboardBootstrap({ force: true });
          setLocation('/dashboard');
        }
      } else {
        // Real API error (wrong password, DB reconnecting, etc.). Never label as network.
        setError(data.message || 'Login failed. Please check your email and password.');
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setError(
          'Login timed out. The server did not respond in time. Check your connection or try again in a minute.',
        );
      } else if (isRealNetworkFailure(err)) {
        setError('Network error. Cannot reach the server. Check your connection and try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleForgotPassword = () => {
    setError('Please contact admin to reset your password.');
  };

  return (
    <div className="asli-app-bg relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-10">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e8f4f6] via-[#d5e8ec] to-[#c5dde3]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmMWY1ZjkiIGZpbGwtb3BhY2l0eT0iMC40Ij48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
      </div>

      {/* Floating Animated Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-sky-300/30 to-blue-300/30 blur-3xl"
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, 30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {showVideo && (
          <motion.div
            key="video"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 w-full h-full flex items-center justify-center z-20"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/logovideo.mp4" type="video/mp4" />
            </video>
            {/* Video overlay for better branding */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-200/80 via-blue-200/80 to-cyan-200/80 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-center"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <img 
                    src="/logo.jpg" 
                    alt="ASLILEARN Logo" 
                    className="w-32 h-32 mx-auto mb-4 object-cover rounded-full shadow-2xl ring-4 ring-white/20"
                  />
                </motion.div>
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-900 mb-2 bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent"
                >
                  ASLILEARN AI
                </motion.h1>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-white/90 text-lg sm:text-xl font-medium"
                >
                  Intelligent Learning Platform
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {showSignInForm && (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="relative z-10 w-full max-w-6xl"
          >
            <Card className="relative grid min-h-[680px] overflow-hidden border-white/60 bg-white/95 p-0 shadow-[0_30px_90px_-30px_rgba(6,36,51,0.4)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
              {/* Decorative gradient overlay */}
              <div className="absolute left-0 right-0 top-0 z-20 h-1.5 bg-gradient-to-r from-teal-green-400 via-indigo-blue-500 to-amber-400" />

              {/* Brand / visual panel */}
              <aside className="relative hidden min-h-full overflow-hidden bg-ink p-10 text-white lg:row-span-2 lg:flex lg:flex-col lg:justify-between xl:p-14">
                <img
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=85"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-35"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#062433]/95 via-[#0b3a45]/88 to-[#0f766e]/75" />
                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-green-400/25 blur-3xl" />

                <div className="relative z-10">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-3 py-2 backdrop-blur-md"
                  >
                    <img
                      src="/logo.jpg"
                      alt="AsliLearn AI"
                      className="h-14 w-14 rounded-2xl bg-white object-contain p-1 shadow-glow"
                    />
                    <span
                      className="font-display text-2xl font-extrabold tracking-tight drop-shadow-md"
                      style={{ color: "#ffffff" }}
                    >
                      ASLILEARN{" "}
                      <span
                        className="rounded-lg bg-teal-green-300 px-2 py-0.5"
                        style={{ color: "#062433" }}
                      >
                        AI
                      </span>
                    </span>
                  </Link>
                </div>

                <div className="relative z-10 max-w-xl">
                  <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-base font-semibold text-teal-green-100 backdrop-blur-md">
                    <Sparkles className="h-5 w-5" />
                    AI-powered education
                  </p>
                  <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight text-white xl:text-6xl">
                    Your classroom,
                    <br />
                    powered by AI.
                  </h1>
                  <p className="mt-6 max-w-lg text-xl leading-relaxed text-white/75">
                    Teach smarter, learn faster, and bring every lesson to life with one intelligent platform.
                  </p>

                  <div className="mt-9 grid gap-3 sm:grid-cols-2">
                    {[
                      "Vidya AI tutor",
                      "Teacher AI studio",
                      "EduOTT learning",
                      "Progress insights",
                    ].map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-base font-semibold text-white/90 backdrop-blur-md"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-green-300 text-ink">
                          ✓
                        </span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="relative z-10 text-base text-white/55">
                  Trusted learning experiences for schools, teachers, and students.
                </p>
              </aside>
              
              <CardHeader className="space-y-4 px-6 pb-4 pt-9 text-left sm:px-10 sm:pt-12 lg:col-start-2 lg:px-12 xl:px-14">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, rotate: -180 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                  className="relative h-16 w-16 lg:hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-300 to-blue-400 rounded-full blur-lg opacity-30"></div>
                  <img 
                    src="/logo.jpg" 
                    alt="ASLILEARN Logo" 
                    className="w-full h-full object-cover rounded-full shadow-xl relative z-10 ring-2 ring-sky-200"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="mb-2 text-base font-bold uppercase tracking-[0.15em] text-teal-green-700">
                    Welcome back
                  </p>
                  <CardTitle className="font-display text-3xl font-bold text-[#0b1f2a] sm:text-4xl">
                    Sign in to AsliLearn
                  </CardTitle>
                  <p className="mt-3 text-lg leading-relaxed text-[#4b6470]">
                    Continue to your personalized learning workspace.
                  </p>
                </motion.div>
              </CardHeader>
              
              <CardContent className="space-y-6 px-6 pb-9 sm:px-10 sm:pb-12 lg:col-start-2 lg:px-12 xl:px-14">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, type: "spring" }}
                  >
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="email" className="flex items-center gap-2 text-base font-semibold text-[#0b1f2a]">
                      <Mail className="h-5 w-5 text-teal-green-600" />
                      Email Address
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-sky-300/20 to-blue-300/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-teal-green-600 transition-colors" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          className="h-14 border-ink/10 bg-white pl-12 pr-4 text-base transition-all duration-200 focus:border-teal-green-500 focus:ring-teal-green-200"
                          required
                        />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="password" className="flex items-center gap-2 text-base font-semibold text-[#0b1f2a]">
                      <Lock className="h-5 w-5 text-teal-green-600" />
                      Password
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-sky-300/20 to-blue-300/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-teal-green-600 transition-colors" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Enter your password"
                          className="h-14 border-ink/10 bg-white pl-12 pr-12 text-base transition-all duration-200 focus:border-teal-green-500 focus:ring-teal-green-200"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition-colors hover:bg-mist hover:text-teal-green-700"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        id="remember"
                        type="checkbox"
                        className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                      />
                      <Label htmlFor="remember" className="cursor-pointer text-base text-gray-600">
                        Remember me
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-base font-semibold text-teal-green-700 transition-colors hover:text-teal-green-800"
                    >
                      Forgot password?
                    </button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Button
                      type="submit"
                      className="group relative h-14 w-full overflow-hidden bg-gradient-to-r from-teal-green-600 to-indigo-blue-600 text-lg font-semibold text-white shadow-elevated transition-all duration-300 hover:shadow-glow-lg"
                      disabled={isLoading}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                            Signing in...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                            Sign In
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    </Button>
                  </motion.div>
                </form>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-center pt-2"
                >
                  <p className="text-base text-gray-600">
                    Don't have an account?{' '}
                    <Link href="/auth/register" className="font-semibold text-teal-green-700 transition-colors hover:text-teal-green-800">
                      Create an account
                    </Link>
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-center pt-4 border-t border-gray-200"
                >
                  <Link href="/" className="group inline-flex items-center gap-2 text-base font-medium text-gray-600 transition-colors hover:text-teal-green-700">
                    <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                    Back to Home
                  </Link>
                </motion.div>

                {/* Decorative Icons */}
                <div className="absolute bottom-4 right-4 hidden sm:flex gap-2 opacity-20">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-cyan-400" />
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-sky-400" />
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
