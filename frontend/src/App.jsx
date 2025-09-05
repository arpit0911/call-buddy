import { useState } from "react";
import "./App.css";
import LandingPage from "./pages/LandingPage";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// function Landing() {}

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* <Route path="/" element={<Landing />} /> */}
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
