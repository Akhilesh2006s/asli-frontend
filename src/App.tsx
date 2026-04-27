import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
const NotFound = lazy(() => import("@/pages/not-found"));
const Homepage = lazy(() => import("./pages/homepage"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const LearningPaths = lazy(() => import("./pages/learning-paths"));
const PracticeTests = lazy(() => import("./pages/practice-tests"));
const AITutor = lazy(() => import("./pages/ai-tutor"));
const Profile = lazy(() => import("./pages/profile"));
const Login = lazy(() => import("./pages/auth/login"));
const Register = lazy(() => import("./pages/auth/register"));
const AdminDashboard = lazy(() => import("./pages/admin/dashboard"));
const AdminSubjectContent = lazy(() => import("./pages/admin/subject-content"));
const SubjectManagement = lazy(() => import("./pages/admin/subject-management"));
const TeacherDashboard = lazy(() => import("./pages/teacher/dashboard"));
const TeacherSubjectContent = lazy(() => import("./pages/teacher/subject-content"));
const TeacherToolPage = lazy(() => import("./pages/teacher/tools/[toolType]"));
const StudentToolPage = lazy(() => import("./pages/student/tools/[toolType]"));
const StudentExams = lazy(() => import("./pages/student-exams"));
const AsliPrepContentPage = lazy(() => import("./pages/asli-prep-content"));
const SubjectContent = lazy(() => import("./pages/subject-content"));
const EduOTT = lazy(() => import("./pages/edu-ott"));
import { EduOTTFilterProvider } from "@/contexts/edu-ott-filter-context";

function EduOTTWithFilters() {
  return (
    <EduOTTFilterProvider>
      <EduOTT />
    </EduOTTFilterProvider>
  );
}
const IQRankBoostSubjects = lazy(() => import("./pages/iq-rank-boost-subjects"));
const IQRankBoostQuiz = lazy(() => import("./pages/iq-rank-boost-quiz"));
const QuizPage = lazy(() => import("./pages/quiz"));
const SuperAdminLogin = lazy(() => import("./pages/super-admin-login"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin-dashboard"));
const SuperAdminSchoolDetail = lazy(() => import("./pages/super-admin-school-detail"));
const SuperAdminTest = lazy(() => import("./pages/super-admin-test"));
const Onboarding = lazy(() => import("./pages/onboarding"));
const AIToolsDashboard = lazy(() => import("./pages/ai-tools-dashboard"));
const Privacy = lazy(() => import("./pages/privacy"));
const Terms = lazy(() => import("./pages/terms"));
const Contact = lazy(() => import("./pages/contact"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Homepage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/learning-paths" component={LearningPaths} />
      <Route path="/tests" component={PracticeTests} />
      <Route path="/student-exams" component={StudentExams} />
      <Route path="/asli-prep-content" component={AsliPrepContentPage} />
      <Route path="/edu-ott" component={EduOTTWithFilters} />
      <Route path="/iq-rank-boost-subjects" component={IQRankBoostSubjects} />
      <Route path="/iq-rank-boost/quiz/:quizId" component={IQRankBoostQuiz} />
      <Route path="/quiz/:id" component={QuizPage} />
      <Route path="/subject/:id" component={SubjectContent} />
      <Route path="/ai-tutor" component={AITutor} />
      <Route path="/ai-tools" component={AIToolsDashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/auth/login" component={Login} />
      <Route path="/signin" component={Login} />
      <Route path="/auth/register" component={Register} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/subject/:id" component={AdminSubjectContent} />
      <Route path="/admin/subjects" component={SubjectManagement} />
      <Route path="/teacher/dashboard" component={TeacherDashboard} />
      <Route path="/teacher/subject/:id" component={TeacherSubjectContent} />
      <Route path="/teacher/tools/:toolType" component={TeacherToolPage} />
      <Route path="/student/tools/:toolType" component={StudentToolPage} />
      <Route path="/super-admin/login" component={SuperAdminLogin} />
      <Route path="/super-admin/dashboard" component={SuperAdminDashboard} />
      <Route path="/super-admin/schools/:id" component={SuperAdminSchoolDetail} />
      <Route path="/super-admin/test" component={SuperAdminTest} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/contact" component={Contact} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense
          fallback={
            <div className="min-h-screen bg-sky-50 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-gray-600">Loading page...</p>
              </div>
            </div>
          }
        >
          <Router />
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
