
import React from "react"

export default function AdminPage() {
    async function makeCollection() {

        try {
            await fetch(`http://localhost:3001/createCollection`, {
                method: "POST"
            })


        } catch (error) {
            console.error(error)
        }
    }

    async function mintAsset() {

        try {
            await fetch(`http://localhost:3001/mintNFT`, {
                method: "POST"
            })

        } catch (error) {
            console.error(error)
        }

    }

    async function fetchCollection() {

        try {
            await fetch(`http://localhost:3001/getCollection`, {
                method: "GET"
            })

        } catch (error) {
            console.error(error)

        }
    }

    // async function testBackend(){
    //     const lowercase = "i am not here"
    //     fetch(`http://localhost:3001/uppercase/${lowercase}`)
    //         .then(res=> res.json())
    //         .then(data=> console.log("Response: ", data.message))
    //         .catch(err=> console.log("Error: ", err))
    // }


    return (
        <div style={{ marginTop: '14vh' }}>
            <h1>Admin</h1>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button onClick={makeCollection}>Create Collection</button>
                <button onClick={mintAsset}>Mint Test Asset</button>
                {/* <button onClick={testBackend}>Test Backend</button> */}
                <button onClick={fetchCollection}>Get Collection</button>
            </div>
        </div>
    )
}