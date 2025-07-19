import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, Toolbar, Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';

import MainHeader from './components/MainHeader';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

import DashboardPage from './pages/DashboardPage';

import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/violation/UnauthorizedPage';
import RulesPage from './pages/RulesPage';
import ViewAllStudentPage from './pages/ViewViolationListPage';
import ViewHygieneDiscipline from './pages/ViewHygieneDiscipline'
import ViewFinalCompetitionResult from './pages/ViewFinalCompetitionResult'
// Violation
import ViolationLayout from './layouts/ViolationLayout';
import RecordViolationPage from './pages/violation/RecordViolationPage';
import ViolationDetailPage from './pages/violation/ViolationDetailPage';
import UnhandledViolationsPage from './pages/violation/UnhandledViolationsPage';
import AllStudentPage from './pages/violation/AllViolationStudentPage';

// Admin
import AdminLayout from './layouts/AdminLayout';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSettingPage from './pages/admin/AdminSettingPage';
import AdminAddClassPage from './pages/admin/AdminAddClassPage';
import AcademicWeeksPage from './pages/admin/AdminWeeksSettingsPage';
import AdminRulesPage from './pages/admin/AdminRulesPage';

// Emulation
import EmulationLayout from './layouts/EmulationLayout';
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
        {/* Login route (full page, no header/sidebar) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin routes (AdminLayout renders header/sidebar internally) */}
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

        {/* Emulation routes (with global header/sidebar) */}
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
        {/* General app routes (with global header/sidebar) */}
        <Route
          path="*"
          element={
            <>
              <MainHeader />
              <Toolbar />
              <Box sx={{ display: 'flex' }}>
                <Sidebar />
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />
                    <Route path="/rules" element={<RulesPage />} />
                    <Route path="/view-all-violations" element={<ViewAllStudentPage />} />
                    <Route path="/view-hygiene-discipline" element={<ViewHygieneDiscipline />} />
                    <Route path="/view-final-competition-result" element={<ViewFinalCompetitionResult />} />
                  </Routes>
                </Box>
              </Box>
            </>
          }
        />
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
