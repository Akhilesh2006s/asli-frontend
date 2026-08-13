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
const TeacherOmrResults = lazy(() => import("./pages/teacher-omr-results"));
const TeacherTimetablePage = lazy(() => import("./pages/teacher/timetable"));
const TeacherSubjectContent = lazy(() => import("./pages/teacher/subject-content"));
const TeacherToolPage = lazy(() => import("./pages/teacher/tools/[toolType]"));
const StudentToolPage = lazy(() => import("./pages/student/tools/[toolType]"));
const StudentExams = lazy(() => import("./pages/student-exams"));
const StudentOmrResults = lazy(() => import("./pages/student-omr-results"));
const StudentTimetable = lazy(() => import("./pages/student-timetable"));
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
const AboutUs = lazy(() => import("./pages/about-us"));
const BookADemo = lazy(() => import("./pages/book-a-demo"));
const Features = lazy(() => import("./pages/marketing-pages"));
const Platform = lazy(() =>
  import("./pages/marketing-pages").then((m) => ({ default: m.PlatformPage })),
);
const Pricing = lazy(() =>
  import("./pages/marketing-pages").then((m) => ({ default: m.PricingPage })),
);
const Resources = lazy(() =>
  import("./pages/marketing-pages").then((m) => ({ default: m.ResourcesPage })),
);
const Faq = lazy(() =>
  import("./pages/marketing-pages").then((m) => ({ default: m.FaqPage })),
);

function RouteLoadingState() {
  // Lightweight route chunk loader — avoid full-screen "Opening Your Workspace"
  // on every sidebar click.
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
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
        <Route path="/about-us" component={AboutUs} />
        <Route path="/book-a-demo" component={BookADemo} />
        <Route path="/features" component={Features} />
        <Route path="/platform" component={Platform} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/resources" component={Resources} />
        <Route path="/faq" component={Faq} />
        <Route path="/privacy-policy" component={Privacy} />
        <Route path="/terms-of-use" component={Terms} />
        <Route path="/privacy">
          <Redirect to="/privacy-policy" />
        </Route>
        <Route path="/terms">
          <Redirect to="/terms-of-use" />
        </Route>
        <Route path="/contact">
          <Redirect to="/book-a-demo" />
        </Route>
        <Route path="/dashboard" component={() => <Guarded Guard={StudentRoute} Page={Dashboard} />} />
        <Route path="/learning-paths" component={() => <Guarded Guard={ProtectedRoute} Page={LearningPaths} />} />
        <Route path="/tests" component={() => <Guarded Guard={StudentRoute} Page={PracticeTests} />} />
        <Route path="/student-exams" component={() => <Guarded Guard={StudentRoute} Page={StudentExams} />} />
        <Route path="/student/results" component={() => <Guarded Guard={StudentRoute} Page={StudentOmrResults} />} />
        <Route path="/student/timetable" component={() => <Guarded Guard={StudentRoute} Page={StudentTimetable} />} />
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
        <Route path="/teacher/quiz/:quizId">
          <Redirect to="/teacher/dashboard" />
        </Route>
        <Route path="/teacher/quiz">
          <Redirect to="/teacher/dashboard" />
        </Route>
        <Route path="/teacher/results" component={() => <Guarded Guard={TeacherRoute} Page={TeacherOmrResults} />} />
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
