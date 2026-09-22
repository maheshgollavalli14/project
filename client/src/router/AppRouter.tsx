import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout.js';
import { AdminLayout } from '../layouts/AdminLayout.js';
import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { AdminRoute } from '../components/AdminRoute.js';

// Public Pages
import { Home } from '../pages/Home.js';
import { About } from '../pages/About.js';
import { Rounds } from '../pages/Rounds.js';
import { Rules } from '../pages/Rules.js';
import { Leaderboard } from '../pages/Leaderboard.js';
import { Contact } from '../pages/Contact.js';
import { Login } from '../pages/Login.js';
import { Register } from '../pages/Register.js';

// Protected Participant Pages
import { Dashboard } from '../pages/Dashboard.js';
import { Submissions } from '../pages/Submissions.js';
import { Round1 } from '../pages/contest/Round1.js';
import { Round2 } from '../pages/contest/Round2.js';
import { Round3 } from '../pages/contest/Round3.js';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard.js';
import { AdminParticipants } from '../pages/admin/AdminParticipants.js';
import { AdminTeams } from '../pages/admin/AdminTeams.js';
import { AdminQuestions } from '../pages/admin/AdminQuestions.js';
import { AdminSubmissions } from '../pages/admin/AdminSubmissions.js';
import { AdminQualification } from '../pages/admin/AdminQualification.js';
import { AdminViolations } from '../pages/admin/AdminViolations.js';
import { AdminSettings } from '../pages/admin/AdminSettings.js';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public & Participant Shell with Navbar and Footer */}
        <Route element={<RootLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/rounds" element={<Rounds />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Participant Pages inside Nav Shell */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/submissions" element={<Submissions />} />
          </Route>
        </Route>

        {/* Dedicated Focused Contest Arenas (FullScreen AntiCheat Environments) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/contest/round-1" element={<Round1 />} />
          <Route path="/contest/round1" element={<Round1 />} />
          <Route path="/contest/round/1" element={<Round1 />} />

          <Route path="/contest/round-2" element={<Round2 />} />
          <Route path="/contest/round2" element={<Round2 />} />
          <Route path="/contest/round/2" element={<Round2 />} />

          <Route path="/contest/round-3" element={<Round3 />} />
          <Route path="/contest/round3" element={<Round3 />} />
          <Route path="/contest/round/3" element={<Round3 />} />
        </Route>

        {/* Dedicated Admin Portal */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/participants" element={<AdminParticipants />} />
            <Route path="/admin/teams" element={<AdminTeams />} />
            <Route path="/admin/questions" element={<AdminQuestions />} />
            <Route path="/admin/submissions" element={<AdminSubmissions />} />
            <Route path="/admin/qualification" element={<AdminQualification />} />
            <Route path="/admin/violations" element={<AdminViolations />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
