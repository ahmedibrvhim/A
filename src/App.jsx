import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Courses from './pages/Courses.jsx';
import Login from './pages/Login.jsx';
import Checkout from './pages/Checkout.jsx';
import Admin from './pages/Admin.jsx';
import Privacy from './pages/Privacy.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="courses" element={<Courses />} />
        <Route path="login" element={<Login />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="admin" element={<Admin />} />
        <Route path="privacy" element={<Privacy />} />
        {/* old URLs */}
        <Route path="shop" element={<Navigate to="/courses" replace />} />
        <Route path="shop.html" element={<Navigate to="/courses" replace />} />
        <Route path="curses.html" element={<Navigate to="/courses" replace />} />
        <Route path="index.html" element={<Navigate to="/" replace />} />
        <Route path="login.html" element={<Navigate to="/login" replace />} />
        <Route path="checkout.html" element={<Navigate to="/checkout" replace />} />
        <Route path="admin.html" element={<Navigate to="/admin" replace />} />
        <Route path="privacy.html" element={<Navigate to="/privacy" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
