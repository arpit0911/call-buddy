import { createContext, useContext, useState } from "react";
import httpStatus from "http-status";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: "http://localhost:3000/api/v1/users",
});

export const AuthProvider = ({ children }) => {
  //   const authContext = useContext(AuthContext);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useNavigate();

  const [userData, setUserData] = useState();

  const handleLogin = async (credentials) => {
    // Implement your login logic here
    console.log("Login:", credentials);
    // Example: await authService.login(credentials);
    try {
      let request = await client.post("/login", credentials);
      console.log(request.data);
      if (request.status === httpStatus.OK) {
        setIsAuthenticated(true);
        setUserData(credentials);
        localStorage.setItem("token", request.data.token);
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: request.data.name,
            username: request.data.username,
          })
        );
        router("/home");
      }
    } catch (error) {
      throw error;
    }
    setIsAuthenticated(true);
  };

  const handleSignup = async (credentials) => {
    // Implement your signup logic here
    console.log("Signup:", credentials);
    // Example: await authService.signup(credentials);
    try {
      let request = await client.post("/register", credentials);
      console.log(request.data);
      if (request.status === httpStatus.CREATED) {
        setIsAuthenticated(true);
        setUserData(credentials);
        // router("/");
      }
    } catch (error) {
      throw error;
    }
  };

  const getHistoryOfUser = async () => {
    try {
      let request = await client.get("/get_all_activity", {
        params: {
          token: localStorage.getItem("token"),
        },
      });
      return request.data;
    } catch (error) {
      console.error("Error fetching user history:", error);
      throw error;
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      let request = await client.post("/add_to_activity", {
        token: localStorage.getItem("token"),
        meetingCode: meetingCode,
      });

      return request;
    } catch (error) {
      throw error;
    }
  };

  const data = {
    isAuthenticated,
    userData,
    onLogin: handleLogin,
    onSignup: handleSignup,
    getHistoryOfUser,
    addToUserHistory,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};
