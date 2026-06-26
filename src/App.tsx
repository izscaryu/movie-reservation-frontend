import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import MoviesPage from './pages/MoviesPage';
import MovieDetailPage from './pages/MovieDetailPage';
import SeatPickerPage from './pages/SeatPickerPage';
import HoldPage from './pages/HoldPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ReservationsPage from './pages/ReservationsPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminMoviesPage from './pages/admin/AdminMoviesPage';
import MovieFormPage from './pages/admin/MovieFormPage';
import AdminShowtimesPage from './pages/admin/AdminShowtimesPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminStub from './pages/admin/AdminStub';
import { NotFoundPage } from './pages/placeholders';
import { RequireAdmin, RequireAuth } from './auth/guards';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MoviesPage />} />
        <Route path="movies/:movieId" element={<MovieDetailPage />} />
        <Route path="showtimes/:showtimeId/seats" element={<SeatPickerPage />} />
        <Route
          path="hold/:reservationId"
          element={
            <RequireAuth>
              <HoldPage />
            </RequireAuth>
          }
        />
        <Route
          path="reservations"
          element={
            <RequireAuth>
              <ReservationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="movies" replace />} />
          <Route path="movies" element={<AdminMoviesPage />} />
          <Route path="movies/new" element={<MovieFormPage />} />
          <Route path="movies/:movieId/edit" element={<MovieFormPage />} />
          <Route path="showtimes" element={<AdminShowtimesPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route
            path="reservations"
            element={<AdminStub title="Admin reservations" part="Part E" />}
          />
          <Route path="*" element={<Navigate to="/admin/movies" replace />} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
