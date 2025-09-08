import React from "react";
import "../App.css";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="landing-page-container">
      <nav>
        <div className="nav-header">
          <h2>CallBuddy</h2>
        </div>
        <div className="nav-list">
          <p>Join as Guest</p>
          <p>Register</p>
          <button className="p-btn">Login</button>
        </div>
      </nav>
      <div className="landing-main-container">
        <div>
          <h1>
            <span style={{ color: "#FF9839" }}>Connect</span> with your Loved
            Ones
          </h1>
          <p>Cover a distance by Call-Buddy</p>
          <Link to="/auth">
            <button className="p-btn">Get Started</button>
          </Link>
        </div>
        <div>
          <img src="/mobile.png" alt="mobile" />
        </div>
      </div>
    </div>
  );
}
