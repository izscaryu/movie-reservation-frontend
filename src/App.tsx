import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import MoviesPage from './pages/MoviesPage';
import {
  AdminPage,
  LoginPage,
  MovieDetailPage,
  NotFoundPage,
  ReservationsPage,
  SeatPickerPage,
  SignupPage,
} from './pages/placeholders';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MoviesPage />} />
        <Route path="movies/:movieId" element={<MovieDetailPage />} />
        <Route path="showtimes/:showtimeId/seats" element={<SeatPickerPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="admin/*" element={<AdminPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
