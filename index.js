const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const bookingCollection = client.db("ktMart").collection("bookings");

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

        // Booking Post Api
        app.post('/bookings', async(req, res) =>{
            const booking = req.body;

            const query = {
                email: booking.email,
                model: booking.model
            }
            const alreadyBooked = await bookingCollection.find(query).toArray();
            if(alreadyBooked.length){
                const message = `Already Booked`;
                return res.send({acknowledged: false, message})
            }
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        // Booking Get Api
        app.get('/bookings', async(req, res) =>{
            const email = req.query.email;
            const query = {email: email};
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
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