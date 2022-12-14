const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;

// Middle wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kdtr5cm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const brandCollection = client.db("ktMart").collection("brands");
        const productCollection = client.db("ktMart").collection("products");

        app.get('/brands', async(req, res) =>{
            const query = {};
            const brands = await brandCollection.find(query).toArray();
            res.send(brands);
        })

        app.get('/products/:name', async(req, res) =>{
            const name = req.params.name;
            const query = {brand: name};
            const brands = await productCollection.find(query).toArray();
            res.send(brands);
        })
    }finally{

    }
}
run().catch(error =>console.error(error))


app.get('/', (req, res) =>{
    res.send('KT Mart server is running')
})

app.listen(port, () =>{
    console.log(`KT Mart server running on ${port}`);
})