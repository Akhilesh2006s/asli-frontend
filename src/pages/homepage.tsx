import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  Sparkles, Brain, BookOpen, Target, TrendingUp, Users, Zap, 
  GraduationCap, UserPlus, Video, FileText, Trophy, Star, CheckCircle, Crown
} from "lucide-react";

const Navbar = () => {
  return (
    <nav className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left - Logo and Brand Name */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="/logo.jpg" 
              alt="AsliLearn Logo" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-2xl md:text-3xl font-extrabold text-blue-600 animate-blue-glow">
              ASLILEARN AI
            </span>
          </Link>

          {/* Right - Login/Signup Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button 
                variant="outline" 
                className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Login
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Index = () => {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  const renderAnimatedHeading = (text = "Learn Smarter,") => (
    <span className="inline-block">
      {text.split("").map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="animate-color-change inline-block"
          style={{
            animationDelay: `${index * 0.1}s`,
            animationDuration: "4s",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-50 relative overflow-hidden">
      <Navbar />
      
      {/* Hero Section - Split Layout */}
      <section className="relative flex items-center overflow-hidden pt-8 pb-12">
        <div className="w-full max-w-7xl mx-auto px-4 py-8 lg:py-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Side - Content */}
            <div className="space-y-6">
            {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">AI-Powered Learning Platform</span>
            </div>

            {/* Main Heading */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {renderAnimatedHeading()}
                <br />
                <span className="text-gray-900">Achieve Faster!</span>
            </h1>

            {/* Description */}
              <p className="text-base md:text-lg text-gray-700 leading-relaxed max-w-xl">
                Master CBSE, ICSE, State Boards, NEET, JEE & more with personalized AI tutoring, 
                interactive videos, and gamified learning. Join 100,000+ students transforming their education!
              </p>
            
            {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/auth/login">
                <Button 
                  size="lg" 
                    className="group bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-lg transition-all px-8 py-6 text-base"
                >
                    <Zap className="mr-2 w-5 h-5" />
                    Start Learning Free
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline"
                onClick={scrollToFeatures}
                  className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-8 py-6 text-base"
              >
                  <Trophy className="mr-2 w-5 h-5" />
                  View Demo
              </Button>
            </div>
            
              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 pt-6">
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-purple-600">10K+</div>
                  <div className="text-xs md:text-sm text-gray-600 mt-1">Active Students</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-orange-500">500+</div>
                  <div className="text-xs md:text-sm text-gray-600 mt-1">Video Lectures</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-green-600">95%</div>
                  <div className="text-xs md:text-sm text-gray-600 mt-1">Success Rate</div>
                </div>
              </div>
              </div>

            {/* Right Side - Hero Image */}
            <div className="hidden lg:block relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="/1765111492896.png" 
                  alt="Students Learning Together" 
                  className="w-full h-auto object-cover rounded-2xl"
                />
              </div>
              <div className="mt-8 text-center">
                <h2 className="text-4xl md:text-5xl font-extrabold leading-tight text-gray-900">
                  {renderAnimatedHeading("ASLILEARN AI")}
                </h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative z-10 bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-200 mb-4">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="text-gray-900">Everything You Need to </span>
              <span className="text-orange-500">Excel</span>
            </h2>
            <p className="text-xl text-gray-700">
              Comprehensive tools designed to make learning engaging, effective, and fun for students of all levels.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                iconBg: "bg-purple-500",
                title: "AI Tutor 24/7",
                description: "Get instant answers, step-by-step explanations, and personalized guidance from our intelligent AI assistant.",
              },
              {
                icon: Video,
                iconBg: "bg-blue-500",
                title: "Interactive Videos",
                description: "Engaging lectures with animations, quizzes, and real-world examples in multiple languages.",
              },
              {
                icon: FileText,
                iconBg: "bg-orange-500",
                title: "Smart Notes & Maps",
                description: "Auto-generated summaries, visual mind maps, and voice-enabled Q&A for efficient revision.",
                highlighted: true,
              },
              {
                icon: Target,
                iconBg: "bg-green-500",
                title: "Adaptive Tests",
                description: "Board-aligned exams with instant AI grading, detailed feedback, and difficulty adjustment.",
              },
              {
                icon: Users,
                iconBg: "bg-blue-500",
                title: "Teacher Connect",
                description: "Real-time doubt resolution, live classes, and interactive whiteboards with expert teachers.",
              },
              {
                icon: Zap,
                iconBg: "bg-orange-500",
                title: "Gamification",
                description: "Earn badges, climb leaderboards, maintain streaks, and unlock rewards as you progress!",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className={`group p-6 bg-white border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                  feature.highlighted ? 'border-blue-200 shadow-md' : 'border-gray-200'
                }`}
              >
                <div className={`mb-4 inline-flex p-4 rounded-xl ${feature.iconBg} text-white shadow-lg`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 relative overflow-hidden z-10 bg-white">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="text-gray-900">How </span>
              <span className="text-blue-600">It Works</span>
            </h2>
            <p className="text-xl text-gray-700">
              Get started in minutes and begin your journey to academic success with our simple, intuitive process.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: UserPlus,
                number: "01",
                title: "Create Your Account",
                description: "Sign up as a student, teacher, or admin and get instant access to your personalized dashboard.",
              },
              {
                icon: BookOpen,
                number: "02",
                title: "Choose Your Path",
                description: "Select your board, class, and subjects. Our AI creates a customized learning path tailored to your goals.",
              },
              {
                icon: Target,
                number: "03",
                title: "Learn & Practice",
                description: "Access interactive video lectures, practice with smart assessments, and get instant feedback from our AI tutor.",
              },
              {
                icon: TrendingUp,
                number: "04",
                title: "Track Progress",
                description: "Monitor your performance with detailed analytics, identify areas for improvement, and achieve academic excellence.",
              },
            ].map((step, index) => (
              <div
                key={index}
                className="relative group text-center"
              >
                {/* Connector Line */}
                {index < 3 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-blue-300 to-blue-400 -translate-x-1/2" />
                )}
                
                <div className="relative space-y-4">
                  {/* Step Number */}
                  <div className="text-6xl font-bold text-blue-100 group-hover:text-blue-200 transition-colors">
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className="flex justify-center -mt-12 mb-4">
                    <div className="p-4 rounded-2xl bg-blue-100 border border-blue-200 group-hover:scale-110 transition-transform">
                      <step.icon className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 relative overflow-hidden z-10 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { value: "10,000+", label: "Active Students" },
              { value: "500+", label: "Expert Teachers" },
              { value: "50+", label: "Partner Schools" },
              { value: "95%", label: "Success Rate" },
            ].map((stat, index) => (
              <div
                key={index}
                className="text-center space-y-2"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base text-gray-700 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Success Stories */}
      <section className="py-24 relative z-10 bg-white">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-50 border-2 border-orange-200 mb-6">
              <span className="text-2xl">"</span>
              <span className="text-sm font-semibold text-orange-700">Student Success Stories</span>
              <span className="text-2xl">"</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="text-gray-900">Loved by </span>
              <span className="text-teal-500">10,000+</span>
              <span className="text-gray-900"> </span>
              <span className="text-purple-600">Students</span>
            </h2>
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section className="py-24 relative z-10 bg-white">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-200 mb-4">
              <Crown className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Flexible Pricing</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="text-gray-900">Choose Your </span>
              <span className="text-purple-600">Learning Plan</span>
            </h2>
            <p className="text-xl text-gray-700">
              Start with our free plan or unlock unlimited potential with premium features. No hidden charges, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Explorer */}
            <Card className="border-2 border-gray-200 hover:shadow-xl transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900">Free Explorer</CardTitle>
                <p className="text-gray-600 text-sm mt-2">Perfect for trying out the platform</p>
                <div className="mt-6">
                  <div className="text-4xl font-bold text-gray-900">₹0</div>
                  <div className="text-gray-600 text-sm">forever</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Access to basic video lectures</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Limited AI tutor queries (10/day)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Basic practice tests</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Community forum access</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">With ads and watermarks</span>
                  </div>
                </div>
                <Link href="/auth/login">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white mt-6">
                    Start Free
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan - ₹249 */}
            <Card className="border-2 border-teal-200 shadow-xl relative hover:shadow-2xl transition-all duration-300">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </div>
              </div>
              <CardHeader className="text-center pb-4 pt-6">
                <CardTitle className="text-2xl font-bold text-gray-900">Premium Plan</CardTitle>
                <p className="text-gray-600 text-sm mt-2">Most popular for serious learners</p>
                <div className="mt-6">
                  <div className="text-4xl font-bold text-gray-900">₹249</div>
                  <div className="text-gray-600 text-sm">/month</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Unlimited AI tutor access</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">All video lectures & animations</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Adaptive tests with AI grading</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Smart notes & mind maps</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Progress analytics</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Download offline content</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Priority support</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">No ads or watermarks</span>
                  </div>
                </div>
                <Link href="/auth/login">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white mt-6">
                    Start 7-Day Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* School Discount Message */}
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Special discounts available for schools and institutions. Contact us for bulk pricing.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Transform Section */}
      <section className="py-24 relative z-10 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900">
              Ready to Transform Your Learning Journey?
            </h2>
            <p className="text-xl md:text-2xl text-gray-700">
              Join thousands of students achieving their academic dreams with AI-powered education
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/auth/login">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg transition-all px-8 py-6 text-base"
                >
                  Start Free Trial Today
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline"
                onClick={scrollToFeatures}
                className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-8 py-6 text-base"
              >
                Explore Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-purple-900 to-purple-800 text-white py-12">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="text-center space-y-6">
            <h3 className="text-2xl font-bold">AsliLearn</h3>
            <p className="text-purple-200 text-lg">
              Empowering Indian students with world-class AI-driven education
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-purple-200">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span className="text-purple-400">|</span>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <span className="text-purple-400">|</span>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact Us
              </Link>
            </div>
            <div className="pt-6 border-t border-purple-700">
              <p className="text-sm text-purple-300">
                © 2025 AsliLearn. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Index;
