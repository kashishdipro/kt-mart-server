const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
        const paymentCollection = client.db("ktMart").collection("payments");

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

        app.get('/product/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const product = await productCollection.findOne(query);
            res.send(product);
        })

        // User Post Api
        app.post('/users', async(req, res) =>{
            const user = req.body;
            const query = {
                email: user.email
            }
            const alreadyUser = await userCollection.find(query).toArray();
            if(alreadyUser.length){
                const message = `You are already user`;
                return res.send({acknowledged: false, message})
            }
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
        app.put('/users/admin/:id', async(req, res) =>{
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

        // User Admin Get Api for protect Admin Route
        app.get('/users/admin/:email', async(req, res) =>{
            const email = req.params.email;
            const query = {email};
            const user = await userCollection.findOne(query);
            res.send({isAdmin: user?.role === 'admin'});
        })

        // User Buyer Get Api for protect Buyer Route
        app.get('/users/buyer/:email', async(req, res) =>{
            const email = req.params.email;
            const query = {email};
            const user = await userCollection.findOne(query);
            res.send({isBuyer: user?.role !== 'seller' && user?.role !== 'admin'});
        })

        // User Seller Get Api for protect Seller Route
        app.get('/users/seller/:email', async(req, res) =>{
            const email = req.params.email;
            const query = {email};
            const user = await userCollection.findOne(query);
            res.send({isSeller: user?.role === 'seller', user});
        })

        // Get Buyers from DB Api
        app.get('/users/buyers', async(req, res) =>{
            const query = {role: 'buyer'};
            const buyer = await userCollection.find(query).toArray();
            res.send(buyer);
        })

        //Get User Api
        app.get('/users/:email', async(req, res) =>{
            const email = req.params.email;
            const query = {email};
            const user = await userCollection.findOne(query);
            res.send(user);
        })
        
        // Get Sellers from DB Api
        app.get('/sellers', async(req, res) =>{
            const query = {role: 'seller'};
            const seller = await userCollection.find(query).toArray();
            res.send(seller);
        })

        // JWT
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

        // Post Product Api
        app.post('/products', async(req, res) =>{
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        // Get My Product using email
        app.get('/products', async(req, res) =>{
            let query = {};
            if(req.query.seller_email){
                query = {
                    seller_email: req.query.seller_email
                }
            }
            const myproducts = await productCollection.find(query).toArray();
            res.send(myproducts);
        })

        // Delete Product Api for seller
        app.delete('/products/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })

        // Update Status Product Api for seller
        app.patch('/products/:id', async(req, res) =>{
            const id = req.params.id;
            const status = req.body.status;
            const query = {_id: ObjectId(id)};
            const updatedStatus = {
                $set: {
                    status: status
                }
            }
            const result = await productCollection.updateOne(query, updatedStatus);
            res.send(result);
        })

        // Get Advertisies Product Api
        app.get('/advertisies', async(req, res) =>{
            const query = {status: 'advertised'};
            const result = await productCollection.find(query).sort({_id: -1}).toArray();
            res.send(result);
        })

        // Delete User Api
        app.delete('/users/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        // User Put Api
        app.put('/users/sellers/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const options = {upsert: true}; 
            const updatedGenuineSeller = {
                $set: {
                    genuine_seller: true
                }
            }
            const result = await userCollection.updateOne(query, updatedGenuineSeller, options);
            res.send(result);
        })

        // Get Booking Id Api
        app.get('/bookings/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await bookingCollection.findOne(query);
            res.send(result);
        })

        // Stripe Payment
        app.post('/create-payment-intent', async(req, res) =>{
            const booking = req.body;
            const price = booking.resale_price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'bdt',
                "payment_method_types": [
                    "card"
                ]
            })
            res.send({
                clientSecret: paymentIntent.client_secret 
            })
        })

        // Payment Post Api
        app.post('/payments', async(req, res) =>{
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);

            // Update product field
            const productId = payment.product_id;
            const filter = {_id: ObjectId(productId)};
            const updatedProduct = {
                $set: {
                    status: 'paid',
                    transactionId: payment.transactionId
                }
            }
            const updatedProductResult = await productCollection.updateOne(filter, updatedProduct);

            // Update booking field
            const id = payment.booking_id;
            const query = {_id: ObjectId(id)};
            const updatedBooking = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedBookingResult = await bookingCollection.updateOne(query, updatedBooking)
            res.send(result);
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