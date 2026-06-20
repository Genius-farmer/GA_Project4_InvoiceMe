import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading..</p>; // wait for session restore before redirecting to sign-in
  if (!user) return <Navigate to="/sign-in" replace />; // not logged in, -> redirect
  return children; // logged in, render the protected route
}
