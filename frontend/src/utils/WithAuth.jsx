import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const withAuth = (WrappedComponent) => {
  const AuthComponent = (props) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useContext(AuthContext); //  Use AuthContext instead of localStorage

    useEffect(() => {
      if (!isAuthenticated) {
        navigate("/"); //  Use replace to clear history
      }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) {
      return null; //  Prevent flash of protected content
    }

    return <WrappedComponent {...props} />;
  };

  return AuthComponent;
};

export default withAuth;
