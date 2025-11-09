import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Homepage from "./pages/homepage";
import Dashboard from "./pages/dashboard";
import LearningPaths from "./pages/learning-paths";
import PracticeTests from "./pages/practice-tests";
import AITutor from "./pages/ai-tutor";
import Profile from "./pages/profile";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import AdminDashboard from "./pages/admin/dashboard";
import AdminSubjectContent from "./pages/admin/subject-content";
import SubjectManagement from "./pages/admin/subject-management";
import TeacherDashboard from "./pages/teacher/dashboard";
import TeacherSubjectContent from "./pages/teacher/subject-content";
import StudentExams from "./pages/student-exams";
import AsliPrepContentPage from "./pages/asli-prep-content";
import SubjectContent from "./pages/subject-content";
import EduOTT from "./pages/edu-ott";
import IQRankBoostSubjects from "./pages/iq-rank-boost-subjects";
import IQRankBoostQuiz from "./pages/iq-rank-boost-quiz";
import SuperAdminLogin from "./pages/super-admin-login";
import SuperAdminDashboard from "./pages/super-admin-dashboard";
import SuperAdminTest from "./pages/super-admin-test";
import Onboarding from "./pages/onboarding";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Homepage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/learning-paths" component={LearningPaths} />
      <Route path="/tests" component={PracticeTests} />
      <Route path="/student-exams" component={StudentExams} />
      <Route path="/asli-prep-content" component={AsliPrepContentPage} />
      <Route path="/edu-ott" component={EduOTT} />
      <Route path="/iq-rank-boost-subjects" component={IQRankBoostSubjects} />
      <Route path="/iq-rank-boost/quiz/:subjectId" component={IQRankBoostQuiz} />
      <Route path="/subject/:id" component={SubjectContent} />
      <Route path="/ai-tutor" component={AITutor} />
      <Route path="/profile" component={Profile} />
      <Route path="/auth/login" component={Login} />
      <Route path="/signin" component={Login} />
      <Route path="/auth/register" component={Register} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/subject/:id" component={AdminSubjectContent} />
      <Route path="/admin/subjects" component={SubjectManagement} />
      <Route path="/teacher/dashboard" component={TeacherDashboard} />
      <Route path="/teacher/subject/:id" component={TeacherSubjectContent} />
      <Route path="/super-admin/login" component={SuperAdminLogin} />
      <Route path="/super-admin/dashboard" component={SuperAdminDashboard} />
      <Route path="/super-admin/test" component={SuperAdminTest} />
      <Route path="/onboarding" component={Onboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
