import React, { useEffect, useState } from "react";
import "./App.css";

import { Route, Routes } from "react-router-dom";
import { useNetwork } from "wagmi";
import { Toaster } from "react-hot-toast";
import Introduction from "./landingpage/Introduction";
import Header from "./components/Header";

import penthouse from "./creatives/penthouse.jpeg";
import ProfileNFT from "./pages/ProfileNFT";


function App() {
  const { chain } = useNetwork();
  console.log("chain:", chain);

  const [isMobile, setIsMobile] = useState(false);

  // useEffect(() => {
  //   // Detect screen width or use a user-agent check
  //   const handleResize = () => {
  //     setIsMobile(window.innerWidth <= 992); // Adjust breakpoint as needed
  //   };

  //   // Initial check
  //   handleResize();

  //   // Add event listener for window resize
  //   window.addEventListener("resize", handleResize);

  //   // Cleanup event listener on unmount
  //   return () => window.removeEventListener("resize", handleResize);
  // }, []);

  return (
    <>
      {isMobile ? (
        <div style={styles.overlay} >
          <div style={styles.messageBox}>
            <h1 style={styles.heading}>We're Optimizing for Mobile!</h1>
            <p style={styles.message}>
              This website is currently designed for desktop view only. Please
              switch to a desktop device for the best experience.
            </p>
            <p style={styles.message}>
              We're working on a mobile-friendly version, coming soon!
            </p>
          </div>
        </div>
      ) : (
        <div className="App">
          <Header />

          <div className="body">
            <Routes>
              <Route path="/" element={<Introduction />} />
              <Route path="/pfp" element={<ProfileNFT />}/>
              {/* <Route path="/swap" element={<Fund />} />
                  <Route path="/mint" element={<DemoApp />} />
                  <Route path="/analytics" element={<Analytics />}/> */}
            </Routes>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  overlay: {
    backgroundImage: `url(${penthouse})`,
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    backgroundColor: "#f8f9fa",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    textAlign: "center",
  },
  messageBox: {
    padding: "20px",
    maxWidth: "400px",
    backdropFilter: "blur(50px)",
    backgroundColor: '#010001',
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
  },
  heading: {
    fontSize: "24px",
    marginBottom: "10px",
    color: "#fff",
  },
  message: {
    fontSize: "16px",
    color: "#cccbcb",
    marginBottom: "10px",
  },
};

export default App;
