import React, { useState } from "react";
import "../styles/chat.css";
import { MdAddBox } from "react-icons/md";

export default function Chat(){
    const [proposal, setProposal] = useState(null);

    const proposals = ["RCIP-1: Funding", "RCIP-2: Investment", "RCIP-3: marketing", "RCIP-4 controls"]

    return(
    <div className="chat-page">
        <h1 className="section-title">Chatbox</h1>
        <div className="chat-box"> 
            <div className="sidebar">
                <h1>Treasury</h1>
                <div style={{display:'flex', flexDirection: 'column',width:'100%', alignItems:'start', margin: '4% 4%'}}>
                    
                    <p><strong>SOL:</strong> 256</p>
                    <p><strong>CEO:</strong> 27,234,373,293</p>
                    <p><strong>USDC:</strong> 30,000</p>

                </div>
                <button>General Chat</button>
                
                <div style={{display:'flex', flexDirection: 'row',width:'100%', justifyContent:'space-between', marginBlock: '4%'}}>
                    <h1>Proposals</h1>
                    <MdAddBox size={36}/>
                </div>
                {proposals.map((item, index)=>(
                    <p key={index} className={proposal===index?"selected-proposal-button":"proposal-button"} onClick={()=>setProposal(index)}>{item}</p>
                ))}

                
            </div>
            <div className="message-box">
                <div className="titlebar">
                    <div style={{display: "flex", flexDirection: 'row'}}>
                        <h2><strong>Time Left: </strong> 140hr</h2>
                        <p><strong>Yes: </strong> 70%</p>
                        <p><strong>No: </strong>30%</p>
                    </div>
                    <div style={{display: "flex", flexDirection: 'row'}}>
                        <h2>Proposal Rejected</h2>
                    </div>
                </div>
                <div className="content-box">
                    <p>Content</p>
                </div>
                <div className="input-box">
                </div>
            </div>
        </div>
    </div>)
}