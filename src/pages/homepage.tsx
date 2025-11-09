import { } from 'react';
import { motion, useScroll } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Brain, 
  Trophy, 
  Users, 
  Star, 
  Target,
  BarChart3,
  Shield,
  TrendingUp,
  Video,
  Crown,
  User
} from 'lucide-react';
import { Link } from 'wouter';

// Professional Header Component
const ProfessionalHeader = () => {
  return (
    <header className="relative z-20 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.jpg" 
              alt="Asli Stud Logo" 
              className="w-12 h-12 object-contain rounded-lg"
            />
            <span className="text-white font-semibold text-xl">Asli Stud</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800 flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

// Professional Bottom Navigation (simplified)
const BottomRightNav = () => {
  return (
    <motion.div 
      className="fixed bottom-6 right-6 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Button
        variant="outline"
        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-lg"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        Back to Top
      </Button>
    </motion.div>
  );
};

// Professional Hero Content
const ProfessionalHeroContent = () => {
  return (
    <main className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
      <div className="text-center max-w-4xl mx-auto">
        <Badge className="mb-6 bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30 backdrop-blur-sm">
          Enterprise Learning Solutions
        </Badge>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Intelligent Learning
          <br />
          <span className="text-blue-400">Platform</span>
        </h1>

        {/* Description */}
        <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto">
          Transform your education with advanced AI technology. Personalized learning paths, 
          interactive content, and intelligent assessments that adapt to your unique learning style.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="border-2 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white px-8 py-6 text-lg">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
};



const Homepage = () => {
  const { scrollYProgress } = useScroll();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Personalized learning paths that adapt to your unique learning style and pace."
    },
    {
      icon: Video,
      title: "Interactive Content",
      description: "Engaging video lectures with real-time AI assistance and interactive elements."
    },
    {
      icon: BarChart3,
      title: "Progress Tracking",
      description: "Comprehensive analytics and progress tracking to monitor your learning journey."
    },
    {
      icon: Target,
      title: "Smart Assessments",
      description: "Intelligent assessments that identify knowledge gaps and provide targeted practice."
    }
  ];

  const stats = [
    { number: "50K+", label: "Active Students", icon: Users, color: "from-blue-500 to-cyan-500" },
    { number: "95%", label: "Success Rate", icon: Trophy, color: "from-green-500 to-emerald-500" },
    { number: "1000+", label: "Video Lectures", icon: Play, color: "from-blue-500 to-cyan-500" },
    { number: "24/7", label: "AI Support", icon: Brain, color: "from-teal-500 to-emerald-500" }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Medical Student, Harvard",
      content: "Asli Stud's Vidya AI helped me master complex anatomy concepts in half the time. The personalized approach is revolutionary.",
      rating: 5
    },
    {
      name: "Alex Rodriguez",
      role: "Engineering Student, MIT",
      content: "The interactive problem-solving sessions and real-time feedback transformed my understanding of calculus and physics.",
      rating: 5
    },
    {
      name: "Priya Sharma",
      role: "JEE Aspirant",
      content: "The adaptive learning system identified my weak areas and created a customized study plan. Scored 98% in my final exam!",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <ProfessionalHeader />
      <BottomRightNav />
      
      {/* Scroll Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <ProfessionalHeroContent />
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Why Choose Asli Stud?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Experience the future of education with our AI-powered platform designed 
              to maximize your learning potential and exam success.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full border border-gray-700 bg-gray-900 hover:bg-gray-800 hover:shadow-xl transition-all duration-300">
                  <CardHeader className="text-center">
                    <div className="w-14 h-14 bg-blue-600/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-7 h-7 text-blue-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-center text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center"
              >
                <div className="w-14 h-14 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4 border border-gray-700">
                  <stat.icon className="w-7 h-7 text-blue-400" />
                  </div>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-400 font-medium text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              What Our Students Say
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Join thousands of successful students who have transformed their learning journey with Asli Stud.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full bg-gray-900 border border-gray-700 hover:bg-gray-800 hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-300 mb-4 italic leading-relaxed">
                      "{testimonial.content}"
                    </p>
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-gray-400 text-sm">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              About Asli Stud
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              We're revolutionizing education with cutting-edge AI technology, making learning personalized, 
              engaging, and effective for students worldwide.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Brain, title: "AI-Powered", description: "Advanced artificial intelligence that adapts to your learning style and pace." },
              { icon: Users, title: "Community", description: "Join thousands of students in a supportive learning community." },
              { icon: Trophy, title: "Results", description: "Proven track record with 95% success rate and improved learning outcomes." }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <Card className="h-full bg-gray-800 border border-gray-700 hover:bg-gray-750 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-blue-600/20 rounded-lg flex items-center justify-center mx-auto mb-4 border border-gray-700">
                      <item.icon className="w-7 h-7 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-6 bg-blue-500 text-white border-blue-400">
              Join the Learning Revolution
            </Badge>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of students who are already experiencing the future of education.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/login">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg">
                      Sign In
                  </Button>
                </Link>
            </div>
            
            {/* Super Admin Access */}
            <div className="mt-8">
                <Link href="/super-admin/login">
                  <Button 
                    variant="outline" 
                    size="sm" 
                  className="border-blue-400 text-blue-100 hover:bg-blue-500/20"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Super Admin Access
                  </Button>
                </Link>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-blue-100 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Loved by 50K+ Students</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>95% Success Rate</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;