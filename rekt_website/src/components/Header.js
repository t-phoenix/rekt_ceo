import React from "react";
import "./header.css";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import Navbar from "./Navbar";
import RektLogo from "../creatives/Rekt_logo_illustration.png"
import { MdMenu } from "react-icons/md";
import ConnectWalletButton from "./ConnectWalletButton";


export default function Header() {

  const navigate = useNavigate();
  const [showMenu, setShowMenu] = React.useState(false);

  const isTab = useMediaQuery({ maxWidth: "992px" });

  function openNavBar() {

    setShowMenu(!showMenu)
  }

  return (
    <div className="header">
      {isTab ? (
        // FOR MOBILE AND TAB
        <div className="header-container mobile-header">
          <div className="nav-burger" onClick={openNavBar}>
            {<MdMenu size={40} />}
          </div>
          <div className="title-container" onClick={() => { navigate("/"); setShowMenu(false); }}>
            {/* <img src={RektLogo} style={{ width: '30px' }} alt="Rekt Logo" /> */}
            <h2 className="title">REKT CEO</h2>
            <p className="icon-title">Be Your Own CEO</p>
          </div>
          <ConnectWalletButton />
        </div>
      ) : (
        // FOR LAPTOP
        <div className="header-container">
          {/* <img src={CiLogo} style={{height: '48px'}} alt="logo" onClick={() => {navigate("/"); setShowMenu(false);}}/> */}
          <img src={RektLogo} style={{ width: '60px' }} alt="Logo" />
          <div className="title-container" onClick={() => { navigate("/"); setShowMenu(false); }}>
            <h2 className="title">CEO</h2>
            <p className="icon-title">Be Your Own CEO</p>

          </div>
          {<Navbar setShow={setShowMenu} />}
        </div>
      )}
      {
        showMenu ? <Navbar setShow={setShowMenu} /> : <></>
      }



    </div>
  );
}
