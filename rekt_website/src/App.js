import React from "react";
import "./App.css";

import { Route, Routes } from "react-router-dom";
import Introduction from "./landingpage/Introduction";
import Header from "./components/Header";
import CustomCursor from "./components/CustomCursor";

import ProfileNFT from "./pages/ProfileNFT";
import AdminPage from "./pages/Admin";
import MemeGen from "./pages/MemeGen";


function App() {

  return (
    <div className="App">
      <CustomCursor />
      <Header />

      <div className="body">
        <Routes>
          <Route path="/" element={<Introduction />} />
          <Route path="/pfp" element={<ProfileNFT />} />
          <Route path="/memes" element={<MemeGen />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* <Route path="/chat" element={<Chat />}/> */}
        </Routes>
      </div>
    </div>

  );
}

export default App;
