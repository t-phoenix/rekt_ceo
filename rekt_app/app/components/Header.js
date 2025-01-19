"use client"
import React from "react";
import "./header.css";
// import { useNavigate } from "react-router-dom";
import { IoMenu } from "react-icons/io5";
import { useMediaQuery } from "react-responsive";
import Navbar from "./Navbar";
// import CiLogo from "../assets/CiLogo.png"
import { MdMenu } from "react-icons/md";
import Link from "next/link";


export default function Header() {
  
  // const navigate = useNavigate();
  const [showMenu, setShowMenu] = React.useState(false);

  const isMobile = useMediaQuery({maxWidth: "600px"})
  const isTab = useMediaQuery({ maxWidth: "992px" });

  function openNavBar(){
    console.log("Show Menu variabel:", showMenu)
    setShowMenu(!showMenu)
  }

  return (
    <div className="header">
      {isTab ? (
        // FOR MOBILE AND TAB
        <div className="header-container">
          <div className="nav-burger" onClick={openNavBar}>
            {<MdMenu size={40}/>}
          </div>
          <div className="title-container">
          {/* <img src={CiLogo} style={{width: '30px'}} alt="Crypto Index Logo"/> */}
            <h2 className="title">REKT CEO</h2>
            <p className="icon-title">by EquiLabs</p>
          </div>
        </div>
      ) : (
        // FOR LAPTOP
        <div className="header-container">
          {/* <img src={CiLogo} style={{height: '48px'}} alt="logo" onClick={() => {navigate("/"); setShowMenu(false);}}/> */}
          <Link href="/" style={{textDecoration: 'none'}}>
          <div className="title-container">
            <h2 className="title">REKT CEO</h2>
            <p className="icon-title">by EquiLabs</p>

          </div>
          </Link>
          {<Navbar setShow={setShowMenu}/>} 
        </div>
      )}
      {
        showMenu? <Navbar setShow={setShowMenu}/>: <></>
      }


      
    </div>
  );
}
