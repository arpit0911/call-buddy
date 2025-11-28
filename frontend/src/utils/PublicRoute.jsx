import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { CircularProgress } from "@mui/material";

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useContext(AuthContext); // isLoading
  const navigate = useNavigate();
  console.log("is authenticated", isAuthenticated);
  // Redirect authenticated users to home

  useEffect(() => {
    // Redirect authenticated users to home
    if (!isLoading && isAuthenticated) {
      //  Wait for loading to complete
      navigate("/home");
    }
  }, [isAuthenticated, isLoading, navigate]); //  isLoading dependency

  // Show loading spinner during auth check OR if authenticated
  if (isLoading || isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <CircularProgress color="secondary" />
        {/* Replace with spinner */}
      </div>
    );
  }

  return children;
};

export default PublicRoute;
