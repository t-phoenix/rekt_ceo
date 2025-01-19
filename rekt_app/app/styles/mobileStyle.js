import penthouse from "../creatives/penthouse.jpeg";


export const styles = {
    overlay: {
      backgroundImage: `url(${penthouse.src})`,
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100vh",
      backgroundColor: "#f8f9fa",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 0,
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