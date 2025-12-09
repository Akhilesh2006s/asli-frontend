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

const Login = () => {
  const [, setLocation] = useLocation();
  const [showVideo, setShowVideo] = useState(true);
  const [showSignInForm, setShowSignInForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle video timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowVideo(false);
      setTimeout(() => {
        setShowSignInForm(true);
      }, 500); // Small delay for smooth transition
    }, 3000); // Show video for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Test backend connection first
      console.log('Testing backend connection...');
      const healthCheck = await fetch(`${API_BASE_URL}/api/health`);
      if (!healthCheck.ok) {
        throw new Error('Backend server is not running. Please check the server status.');
      }
      console.log('Backend server is running');

      // Use direct backend URL for production
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login successful, user role:', data.user.role);
        
        // Store JWT token in localStorage
        if (data.token) {
          localStorage.setItem('authToken', data.token);
          console.log('JWT token stored in localStorage');
        }
        
        // Store user role and email for immediate display
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userEmail', data.user.email);
        console.log('User role and email stored:', data.user.role, data.user.email);
        
        // Redirect based on user role
        if (data.user.role === 'super-admin') {
          console.log('Redirecting to super admin dashboard');
          setLocation('/super-admin/dashboard');
        } else if (data.user.role === 'admin') {
          console.log('Redirecting to admin dashboard');
          setLocation('/admin/dashboard');
        } else if (data.user.role === 'teacher') {
          console.log('Redirecting to teacher dashboard');
          setLocation('/teacher/dashboard');
        } else {
          console.log('Redirecting to student dashboard');
          setLocation('/dashboard');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100">
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
                  className="text-5xl font-bold text-blue-900 mb-2 bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent"
                >
                  ASLILEARN AI
                </motion.h1>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-white/90 text-xl font-medium"
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
            className="relative z-10 w-full max-w-md"
          >
            {/* Glassmorphism Card with Enhanced Design */}
            <Card className="backdrop-blur-xl bg-white/90 border-white/30 shadow-2xl relative overflow-hidden">
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-400"></div>
              
              <CardHeader className="text-center space-y-4 pb-6 pt-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, rotate: -180 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                  className="w-24 h-24 mx-auto relative"
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
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-sky-600 via-blue-500 to-cyan-600 bg-clip-text text-transparent">
                    Welcome Back
                  </CardTitle>
                  <p className="text-gray-600 mt-2 text-sm">
                    Sign in to continue your learning journey
                  </p>
                </motion.div>
              </CardHeader>
              
              <CardContent className="space-y-6 px-8 pb-8">
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

                <form onSubmit={handleSubmit} className="space-y-5">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-indigo-500" />
                      Email Address
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-sky-300/20 to-blue-300/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          className="pl-12 pr-4 h-12 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white/50 backdrop-blur-sm"
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
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-500" />
                      Password
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-sky-300/20 to-blue-300/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Enter your password"
                          className="pl-12 pr-12 h-12 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        id="remember"
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                      />
                      <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                    <Link href="/auth/forgot-password" className="text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors">
                      Forgot password?
                    </Link>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 hover:from-sky-600 hover:via-blue-600 hover:to-cyan-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                      disabled={isLoading}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                            Signing in...
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5" />
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
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link href="/auth/register" className="text-sky-600 hover:text-sky-700 font-semibold transition-colors">
                      Sign up here
                    </Link>
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-center pt-4 border-t border-gray-200"
                >
                  <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-sky-600 transition-colors font-medium group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                  </Link>
                </motion.div>

                {/* Decorative Icons */}
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-20">
                  <BookOpen className="w-6 h-6 text-cyan-400" />
                  <GraduationCap className="w-6 h-6 text-sky-400" />
                  <Sparkles className="w-6 h-6 text-blue-400" />
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
