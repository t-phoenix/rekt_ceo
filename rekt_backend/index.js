// IMPORTS
const express = require('express')
const cors = require('cors')
const multer  = require('multer')
const fs = require('fs')
const bodyParser = require('body-parser')
const {PinataSDK} = require('pinata-web3')
const { uploadMetadata, uploadImageWithFile } = require('./services/pinata')
require('dotenv').config();
const { createCollection, createNFTCollection, mintNFT, getCollection } = require('./services/metaplex')
const { createCandyMachine } = require('./services/candymachine')


// APP
const app = express()
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.json());

// STORAGE: multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads'); // Save files in "uploads" folder
    },
    filename: (req, file, cb) => {
        cb(null, `${file.originalname}`);
    },
});

const upload = multer({storage:storage});


// FUNCTIONS
app.get('/', (req, res) => res.json({message: "hello world!"}))
app.get('/uppercase/:theValue', (req, res) => res.json({message: req.params.theValue.toUpperCase()}))


//PINATA
// app.post('/uploadImage', upload.single('image'), uploadImageToPinata)
app.post('/uploadImageAndMetadata', upload.single('image'), async (req, res) =>{
    try {
        // Access the image file
        const imageFile = req.file;
        console.log('Received Image File:', imageFile.originalname);
        
        // Step1: Upload Image to Pinata
        const imageUploadResponse = await uploadImageWithFile(imageFile);
        console.log("Image Response", imageUploadResponse);

        // Access attribute list
        const attributes = JSON.parse(req.body.attributes);
        const metadataParams = {
            imageUri: `https://${process.env.REACT_APP_GATEWAY_URL}/ipfs/${imageUploadResponse.IpfsHash}`,
            attributes: attributes
        }

        // Step2: Create and Upload JSON Metadata file to Pinata
        const metdataUploadResponse = await uploadMetadata(metadataParams)
        console.log("Metadata Response", metdataUploadResponse);

        // Example Response
        res.json({
          message: 'File and attributes uploaded successfully',
          name: imageFile.originalname,
          imageResponse: imageUploadResponse,
          metadataResponse: metdataUploadResponse
        });
      } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Failed to upload file and attributes' });
      }
} )

//METAPLEX
app.get('/getCollection', getCollection)
app.post('/createCollection', createCandyMachine)
app.post('/mintNFT', mintNFT)

// INIT
app.listen(3001, () => console.log('Server is running on port 3001'))