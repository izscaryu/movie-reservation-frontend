import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import MoviesPage from './pages/MoviesPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import {
  AdminPage,
  MovieDetailPage,
  NotFoundPage,
  ReservationsPage,
  SeatPickerPage,
} from './pages/placeholders';
import { RequireAdmin, RequireAuth } from './auth/guards';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MoviesPage />} />
        <Route path="movies/:movieId" element={<MovieDetailPage />} />
        <Route path="showtimes/:showtimeId/seats" element={<SeatPickerPage />} />
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
