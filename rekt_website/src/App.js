import React from "react";
import "./App.css";

import { Route, Routes } from "react-router-dom";
import { useNetwork } from "wagmi";
import {Toaster} from "react-hot-toast";
import Introduction from "./landingpage/Introduction";
import Header from "./components/Header";

function App() {
  const { chain } = useNetwork();
  console.log("chain:", chain);

  return (
    <div className="App">
      <Header />

      <div className="body">
        <Routes>
          <Route path="/" element={<Introduction />} />
          {/* <Route path="/swap" element={<Fund />} />
          <Route path="/mint" element={<DemoApp />} />
          <Route path="/analytics" element={<Analytics />}/> */}
        </Routes>
      </div>

      {/* <Footer/>
      <Toaster toastOptions={{duration: 8000, style: {maxWidth: 800}}}/> */}
      
    </div>
  );
}

export default App;
