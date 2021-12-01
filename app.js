require('dotenv').config(); //to use environment variables to keep our encryption keys and/or api keys safe  //the .env file will be in gitignore so that its hidden from ppl on internet
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose= require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true});  //database name is userDB



// const userSchema = {  //creating the model for database named userDB
//   email:String,       //this is a simple js object......but for encryption, we need to modify it using new mongoose.Schema
//   password:String
// };
const userSchema = new mongoose.Schema({  //i was talking abt this in the above line (mongoose.Schema....needed for encryption)
  email:String,             //userSchema is no more a simple js object, but is now an object created using mongoose schema class
  password:String
});

// var secret = "ThisIsOurLittleSecret.";  //just a long string which we will use for encryption
//---NOTE-- the above line should hv been there IF we did not want to encrypt our encryption key....BUT...since we have .env file for nvironment variables, we will define our secret(or encryption key) there----MUST see syntax of .env mongoose extension to understand what we wrote in .env file
userSchema.plugin(encrypt, { secret: process.env.SECRET ,encryptedFields:["password"] });//process.env.SECRET is to get password from the .env file //we are encrypting the PASSWORD ONLY!!!not the email.....if we wanted to encrypt ALL the fields, then NO need of (encryptedFields) wala statement.... //these 2 lines of (var secret) and (userSchema.pligin) MUST be above the (const User) line.....ie MUST be before we define the model

//----MUST READ NEXT LINE------------
//whenever we save a new entry in database, like we did in app.post("/register",function) wala part, then while saving, encryption takes place.......AND.....whenever we find for an entry, like we did in app.post("/login",function) wala section, it automatically DECRYPTS!!!!

const User = new mongoose.model("User",userSchema);  //name of model is User and its entries would be named users



app.get("/",function(req,res){  //get is similar to read in CRUD operstions
  res.render("home");  // no forward slash is required for rendering
});

app.get("/login",function(req,res){
  res.render("login");    // no forward slash is required for rendering
});

app.get("/register",function(req,res){
  res.render("register");     // no forward slash is required for rendering
});




app.post("/register",function(req,res){   //post is similar to create in CRUD.......here we are creating an entry of email and password from the register page into our databade
  const newUser = new User({
    email:req.body.userKaNameForRegister,
    password:req.body.userKaPasswordForRegister
  });
  newUser.save(function(err){   //password encrypted on saving
    if(!err){
      res.render("secrets");     // no forward slash is required for rendering
    }else{
      console.log(err);
    }
  });
});

app.post("/login",function(req,res){
  const checkEmail = req.body.usernameForLogin;
  const checkPassword = req.body.passwordForLogin;

  User.findOne({email:checkEmail} , function(err, foundUser){  //finding a user with email===checkEmail....if found, then that entry was foundUser
    if(err){                 //password decrypted on finding
      console.log(err);
    }else{
      if(foundUser){
        if(foundUser.password===checkPassword){
          res.render("secrets");
        }
      }
    }
  });
});





app.listen(3000, function(){
  console.log("server started on 3000");
});
