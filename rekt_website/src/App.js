import React from "react";
import "./App.css";

import { Route, Routes } from "react-router-dom";
import Introduction from "./pages/landingpage/Introduction";
import Header from "./components/Header";
import CustomCursor from "./components/CustomCursor";

import ProfileNFT from "./pages/ProfileNFT";
import AdminPage from "./pages/Admin";
import MemeGen from "./pages/MemeGen";
import Blueprint from "./pages/Blueprint";
import BuyCEOPage from "./pages/BuyCEOPage";
import { InitNexusOnConnect } from "./components/nexus/InitNexusOnConnect";
import { Analytics } from '@vercel/analytics/react';


function App() {

  return (
    <div className="App">
      <InitNexusOnConnect />
      <CustomCursor />
      <Header />

      <div className="body">
        <Routes>
          <Route path="/" element={<Introduction />} />
          <Route path="/pfp" element={<ProfileNFT />} />
          <Route path="/buy-ceo" element={<BuyCEOPage />} />
          <Route path="/memes" element={<MemeGen />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/blueprint" element={<Blueprint />} />

          {/* <Route path="/chat" element={<Chat />}/> */}
        </Routes>
      </div>
      <Analytics />
    </div>

  );
}

export default App;
