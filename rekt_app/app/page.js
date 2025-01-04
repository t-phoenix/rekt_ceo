"use client"

import React from "react";
import Image from "next/image";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Introduction from "./landingpage/Introduction";


export default function Home() {
  function handleTest(){
    console.log("Testing Handle Onclick...")
  }

  return (
    <BrowserRouter>

    <div className="App">
      <Header />

      <div className="body">
        <Routes>
          <Route path="/" element={<Introduction />} />
          {/* <Route path="/pfp" element={<ProfileNFT />}/>
          <Route path="/memes" element={<Meme />}/>
          <Route path="/admin" element={<AdminPage/>} /> */}
          {/* <Route path="/chat" element={<Chat />}/> */}
        </Routes>
      </div>

    </div>
    </BrowserRouter>
  );
}
