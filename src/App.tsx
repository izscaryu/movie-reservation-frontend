import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import MoviesPage from './pages/MoviesPage';
import MovieDetailPage from './pages/MovieDetailPage';
import SeatPickerPage from './pages/SeatPickerPage';
import HoldPage from './pages/HoldPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ReservationsPage from './pages/ReservationsPage';
import { AdminPage, NotFoundPage } from './pages/placeholders';
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
          path="admin/*"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
