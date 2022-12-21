const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;

// Middle wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kdtr5cm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'Unauthorized Access!'});
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'Forbidden Access!'});
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){
    try{
        const brandCollection = client.db("ktMart").collection("brands");
        const productCollection = client.db("ktMart").collection("products");
        const bookingCollection = client.db("ktMart").collection("bookings");
        const userCollection = client.db("ktMart").collection("users");

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
        app.get('/bookings', verifyJWT, async(req, res) =>{
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if(email !== decodedEmail){
                return res.status(403).send({message: 'Forbidden Access!'});
            }

            const query = {email: email};
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })

        // User Post Api
        app.post('/users', async(req, res) =>{
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        // User Get Api
        app.get('/users', async(req, res) =>{
            const query = {};
            const users = await userCollection.find(query).toArray();
            res.send(users);
        })

        // User Put Api
        app.put('/users/admin/:id', verifyJWT, async(req, res) =>{
            const decodedEmail = req.decoded.email;
            const filter = {email: decodedEmail};
            const user = await userCollection.findOne(filter);
            if(user?.role !== 'admin'){
                return res.status(403).send({message: 'Forbidden Access!'});
            }
            
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const options = {upsert: true}; 
            const updatedRole = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(query, updatedRole, options);
            res.send(result);
        })

        // User Admin Get Api
        app.get('/users/admin/:email', async(req, res) =>{
            const email = req.params.email;
            const query = {email};
            const user = await userCollection.findOne(query);
            res.send({isAdmin: user?.role === 'admin'});
        })

        // User Buyer Get Api
        app.get('/users/buyer/:email', async(req, res) =>{
            const email = req.params.email;
            const query = {email};
            const user = await userCollection.findOne(query);
            res.send({isBuyer: user?.role !== 'seller' && user?.role !== 'admin'});
        })

        app.get('/jwt', async(req, res) =>{
            const email = req.query.email;
            const query = {email: email};
            const user = await userCollection.findOne(query);
            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '7d'});
                return res.send({accessToken: token})
            }
            res.status(403).send({accessToken: ''})
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