import React, { Suspense, lazy } from "react";
import "./App.css";

import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import CustomCursor from "./components/CustomCursor";
import PageLoader from "./components/PageLoader";
import { InitNexusOnConnect } from "./components/nexus/InitNexusOnConnect";
import { Analytics } from '@vercel/analytics/react';

const Introduction = lazy(() => import("./pages/landingpage/Introduction"));
const ProfileNFT = lazy(() => import("./pages/ProfileNFT"));
const AdminPage = lazy(() => import("./pages/Admin"));
const MemeGen = lazy(() => import("./pages/MemeGen"));
const Blueprint = lazy(() => import("./pages/Blueprint"));
const BuyCEOPage = lazy(() => import("./pages/BuyCEOPage"));
const LaunchHub = lazy(() => import("./pages/launch/LaunchHub"));




function App() {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="App">
      <InitNexusOnConnect />
      {!isDev && <CustomCursor />}
      <Header />

      <div className="body">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Introduction />} />
            <Route path="/pfp" element={<ProfileNFT />} />
            <Route path="/buy-ceo" element={<BuyCEOPage />} />
            <Route path="/memes" element={<MemeGen />} />
            <Route path="/launch" element={<LaunchHub />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/blueprint" element={<Blueprint />} />
          </Routes>
        </Suspense>
      </div>
      <Analytics />
    </div>

  );
}

export default App;
