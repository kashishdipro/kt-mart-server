const express = require('express');
const cors = require('cors');
const app = express();

const port = process.env.PORT || 5000;

// Middle wares
app.use(cors());
app.use(express.json());

app.get('/', (req, res) =>{
    res.send('KT Mart server is running')
})

app.listen(port, () =>{
    console.log(`KT Mart server running on ${port}`);
})