const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const bcrypt = require('bcrypt');

const uri = process.env.DB_URI

const port = process.env.PORT

app.use(express.json())
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
})
app.get('/', (req, res) => {
  res.send('Hello World!')
})
async function run() {
  try {
   
    await client.connect();

    const db = client.db('jwt-recap')
    const usersCollections = db.collection('users')

    app.post('/register',async(req,res)=>{
        const {name,email,password} = req.body

        const existingUser = await usersCollections.findOne({email})
        if(existingUser){
            return res.status(400).json({
                message:"User Already Exist!"
            })
        }
        const hashedPassword = await bcrypt.hash(password,10)
        const result = await usersCollections.insertOne({
            email,
            name,
            password:hashedPassword
        })
        res.status(201).json({
            message : 'User Created Successfully',
            result
        })
    })
    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    // await client.close();
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log(`server running on port : ${port}`)
})
