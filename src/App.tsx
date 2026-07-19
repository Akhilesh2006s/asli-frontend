import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import NotFound from "@/pages/not-found";
import Homepage from "./pages/homepage";
import { EduOTTFilterProvider } from "@/contexts/edu-ott-filter-context";
import { IndividualTrialGate } from "@/components/IndividualTrialGate";
import { TrialLoginQuizPrompt } from "@/components/TrialLoginQuizPrompt";
import {
  ProtectedRoute,
  StudentRoute,
  TeacherRoute,
  AdminRoute,
  SuperAdminRoute,
} from "@/components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/dashboard"));
const LearningPaths = lazy(() => import("./pages/learning-paths"));
const PracticeTests = lazy(() => import("./pages/practice-tests"));
const AITutor = lazy(() => import("./pages/ai-tutor"));
const Profile = lazy(() => import("./pages/profile"));
const Login = lazy(() => import("./pages/auth/login"));
const Register = lazy(() => import("./pages/auth/register"));
const Subscribe = lazy(() => import("./pages/auth/subscribe"));
const AdminDashboard = lazy(() => import("./pages/admin/dashboard"));
const AdminSubjectContent = lazy(() => import("./pages/admin/subject-content"));
const SubjectManagement = lazy(() => import("./pages/admin/subject-management"));
const TimetableManagementPage = lazy(() => import("./pages/admin/timetable"));
const TeacherDashboard = lazy(() => import("./pages/teacher/dashboard"));
const TeacherTimetablePage = lazy(() => import("./pages/teacher/timetable"));
const TeacherSubjectContent = lazy(() => import("./pages/teacher/subject-content"));
const TeacherToolPage = lazy(() => import("./pages/teacher/tools/[toolType]"));
const StudentToolPage = lazy(() => import("./pages/student/tools/[toolType]"));
const StudentExams = lazy(() => import("./pages/student-exams"));
const AsliPrepContentPage = lazy(() => import("./pages/asli-prep-content"));
const SubjectContent = lazy(() => import("./pages/subject-content"));
const EduOTT = lazy(() => import("./pages/edu-ott"));
const IQRankBoostSubjects = lazy(() => import("./pages/iq-rank-boost-subjects"));
const IQRankBoostQuiz = lazy(() => import("./pages/iq-rank-boost-quiz"));
const QuizPage = lazy(() => import("./pages/quiz"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin-dashboard"));
const SuperAdminSchoolDetail = lazy(() => import("./pages/super-admin-school-detail"));
const Onboarding = lazy(() => import("./pages/onboarding"));
const AIToolsDashboard = lazy(() => import("./pages/ai-tools-dashboard"));
const Privacy = lazy(() => import("./pages/privacy"));
const Terms = lazy(() => import("./pages/terms"));
const Contact = lazy(() => import("./pages/contact"));

function RouteLoadingState() {
  return (
    <div className="asli-app-bg flex min-h-screen items-center justify-center p-6" role="status">
      <div className="asli-card-premium flex w-full max-w-xl flex-col items-center p-8 text-center sm:p-10">
        <div className="mb-6 flex h-20 w-20 animate-ai-pulse items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-blue-600 to-blue-500 shadow-glow">
          <img src="/logo.jpg" alt="AsliLearn" className="h-14 w-14 rounded-2xl object-cover" />
        </div>
        <p className="font-display text-3xl font-bold text-slate-900">Opening Your Workspace</p>
        <p className="mt-3 text-lg text-slate-600">Preparing a clear, personalised view for you.</p>
        <div className="mt-8 w-full space-y-3" aria-hidden="true">
          <div className="mx-auto h-4 w-2/3 animate-pulse rounded-full bg-indigo-blue-100" />
          <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
          <div className="mx-auto h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

function EduOTTWithFilters() {
  return (
    <EduOTTFilterProvider>
      <EduOTT />
    </EduOTTFilterProvider>
  );
}

function Guarded({
  Guard,
  Page,
}: {
  Guard: ComponentType<{ children: ReactNode }>;
  Page: ComponentType;
}) {
  return (
    <Guard>
      <Page />
    </Guard>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <Switch>
        <Route path="/" component={Homepage} />
        <Route path="/dashboard" component={() => <Guarded Guard={StudentRoute} Page={Dashboard} />} />
        <Route path="/learning-paths" component={() => <Guarded Guard={ProtectedRoute} Page={LearningPaths} />} />
        <Route path="/tests" component={() => <Guarded Guard={StudentRoute} Page={PracticeTests} />} />
        <Route path="/student-exams" component={() => <Guarded Guard={StudentRoute} Page={StudentExams} />} />
        <Route path="/asli-prep-content" component={() => <Guarded Guard={StudentRoute} Page={AsliPrepContentPage} />} />
        <Route path="/edu-ott" component={() => <Guarded Guard={ProtectedRoute} Page={EduOTTWithFilters} />} />
        <Route path="/iq-rank-boost-subjects" component={() => <Guarded Guard={StudentRoute} Page={IQRankBoostSubjects} />} />
        <Route path="/iq-rank-boost/quiz/:quizId" component={() => <Guarded Guard={StudentRoute} Page={IQRankBoostQuiz} />} />
        <Route path="/quiz/:id" component={() => <Guarded Guard={StudentRoute} Page={QuizPage} />} />
        <Route path="/subject/:id" component={() => <Guarded Guard={StudentRoute} Page={SubjectContent} />} />
        <Route path="/ai-tutor" component={() => <Guarded Guard={StudentRoute} Page={AITutor} />} />
        <Route path="/ai-tools" component={() => <Guarded Guard={ProtectedRoute} Page={AIToolsDashboard} />} />
        <Route path="/profile" component={() => <Guarded Guard={ProtectedRoute} Page={Profile} />} />
        <Route path="/auth/login" component={Login} />
        <Route path="/signin" component={Login} />
        <Route path="/auth/register" component={Register} />
        <Route path="/auth/subscribe" component={Subscribe} />
        <Route path="/admin/dashboard" component={() => <Guarded Guard={AdminRoute} Page={AdminDashboard} />} />
        <Route path="/admin/subject/:id" component={() => <Guarded Guard={AdminRoute} Page={AdminSubjectContent} />} />
        <Route path="/admin/subjects" component={() => <Guarded Guard={AdminRoute} Page={SubjectManagement} />} />
        <Route path="/admin/timetable" component={() => <Guarded Guard={AdminRoute} Page={TimetableManagementPage} />} />
        <Route path="/teacher/dashboard" component={() => <Guarded Guard={TeacherRoute} Page={TeacherDashboard} />} />
        <Route path="/teacher/timetable" component={() => <Guarded Guard={TeacherRoute} Page={TeacherTimetablePage} />} />
        <Route path="/teacher/subject/:id" component={() => <Guarded Guard={TeacherRoute} Page={TeacherSubjectContent} />} />
        <Route path="/teacher/tools/:toolType" component={() => <Guarded Guard={TeacherRoute} Page={TeacherToolPage} />} />
        <Route path="/student/tools/:toolType" component={() => <Guarded Guard={StudentRoute} Page={StudentToolPage} />} />
        <Route path="/super-admin/dashboard" component={() => <Guarded Guard={SuperAdminRoute} Page={SuperAdminDashboard} />} />
        <Route path="/super_admin/dashboard">
          <Redirect to="/super-admin/dashboard" />
        </Route>
        <Route path="/super-admin/schools/:id" component={() => <Guarded Guard={SuperAdminRoute} Page={SuperAdminSchoolDetail} />} />
        <Route path="/super_admin/schools/:id">
          {(params) => <Redirect to={`/super-admin/schools/${params.id}`} />}
        </Route>
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/contact" component={Contact} />
        {/* Preview/test routes removed from production router */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <IndividualTrialGate>
          <TrialLoginQuizPrompt />
          <Router />
        </IndividualTrialGate>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
