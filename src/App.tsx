import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';

import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import Layout from './layouts/Layout';
import AdminLayout from './layouts/AdminLayout';
import ViolationLayout from './layouts/ViolationLayout';
import EmulationLayout from './layouts/EmulationLayout';

// Pages
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/violation/UnauthorizedPage';
import RulesPage from './pages/RulesPage';
import ViewViolationListPage from './pages/ViewViolationListPage';
import ViewHygieneDiscipline from './pages/ViewHygieneDiscipline';
import ViewFinalCompetitionResult from './pages/ViewFinalCompetitionResult';

// Violation
import RecordViolationPage from './pages/violation/RecordViolationPage';
import ViolationDetailPage from './pages/violation/ViolationDetailPage';
import UnhandledViolationsPage from './pages/violation/UnhandledViolationsPage';
import AllStudentPage from './pages/violation/AllViolationStudentPage';

// Admin
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSettingPage from './pages/admin/AdminSettingPage';
import AdminAddClassPage from './pages/admin/AdminAddClassPage';
import AcademicWeeksPage from './pages/admin/AdminWeeksSettingsPage';
import AdminRulesPage from './pages/admin/AdminRulesPage';

// Emulation
import EnterExamScoresPage from './pages/emulation/ClassAcademicScoresPage';
import EnterViolationScoresPage from './pages/emulation/ClassViolationScoresPage';
import EnterClassHygieneScorePage from './pages/emulation/ClassHygieneScorePage';
import EnterClassAttendanceSummaryPage from './pages/emulation/ClassAttendanceSummaryPage';
import EnterClassLineUpSummaryPage from './pages/emulation/ClassLineUpSummaryPage';
import WeeklyScoresPage from './pages/emulation/WeeklyScoresPage';

function AppContent() {
  return (
    <Router>
      <CssBaseline />
      <Routes>
        {/* Login route (không dùng layout) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="settings" element={<AdminSettingPage />} />
          <Route path="add-class" element={<AdminAddClassPage />} />
          <Route path="weeks" element={<AcademicWeeksPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="rules" element={<AdminRulesPage />} />
        </Route>

        {/* Emulation routes */}
        <Route
          path="/emulation/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EmulationLayout />
            </ProtectedRoute>
          }
        >
          <Route path="class-academic-scores" element={<EnterExamScoresPage />} />
          <Route path="class-violation-scores" element={<EnterViolationScoresPage />} />
          <Route path="class-hygiene-score" element={<EnterClassHygieneScorePage />} />
          <Route path="class-attendance-summaries" element={<EnterClassAttendanceSummaryPage />} />
          <Route path="class-lineup-summaries" element={<EnterClassLineUpSummaryPage />} />
          <Route path="weekly-scores" element={<WeeklyScoresPage />} />
        </Route>

        {/* Violation routes */}
        <Route
          path="/violation/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'student']}>
              <ViolationLayout />
            </ProtectedRoute>
          }
        >
          <Route path="" element={<RecordViolationPage />} />
          <Route path="violations/:name" element={<ViolationDetailPage />} />
          <Route path="unhandled" element={<UnhandledViolationsPage />} />
          <Route path="all-violations" element={<AllStudentPage />} />
        </Route>

        {/* General app routes (dùng Layout chung) */}
     <Route
  path="*"
  element={
      <Layout />    
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/view-all-violations" element={<ViewViolationListPage />} />
          <Route path="/view-hygiene-discipline" element={<ViewHygieneDiscipline />} />
          <Route path="/view-final-competition-result" element={<ViewFinalCompetitionResult />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
