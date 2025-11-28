import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  console.log("is authenticated", isAuthenticated);
  // Redirect authenticated users to home
  if (isAuthenticated) {
    navigate("/home", { replace: true });
    return null;
  }

  return children;
};

export default PublicRoute;
