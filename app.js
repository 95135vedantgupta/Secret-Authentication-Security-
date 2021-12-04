//jshint esversion:6
require('dotenv').config(); //to use environment variables to keep our encryption keys and/or api keys safe  //the .env file will be in gitignore so that its hidden from ppl on internet
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose= require("mongoose");
// const encrypt = require("mongoose-encryption");  //removed this once we installed the md5 for hashing
// var md5 = require('md5'); //remove this once we have installed bcrypt
// const bcrypt = require('bcrypt');
// const saltRounds = 10;//no of rounds of salting/becrypting....more this no, more is the time and effort taken to create this password
//delete the -----ABOVE 2 LINES -------once we start using passport
//below this...all lines are for passport
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;  //this is a package used to create a passport strategy
const findOrCreate = require("mongoose-findorcreate");  //imp for passport.use(new GoogleStrategy({...}); wala part   //ie. find user to get info, and if there is no such user, then create info abt him





const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));




app.use(session({        //this part is of setting up our sessions....place just above mongoose.connect
  //store as environment variable
  secret: 'OUr little secret.',//a string...later on store in environment files to keep safe from users on internet
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize()); //initializing passport
app.use(passport.session());  //use passport to manage our sessions

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true});  //database name is userDB



// const userSchema = {  //creating the model for database named userDB
//   email:String,       //this is a simple js object......but for encryption, we need to modify it using new mongoose.Schema
//   password:String
// };
const userSchema = new mongoose.Schema({  //i was talking abt this in the above line (mongoose.Schema....needed for encryption)
  email:String,             //userSchema is no more a simple js object, but is now an object created using mongoose schema class
  password:String,
  googleId: String,  //for findOrCreate part for googleId
  secret: String
});

// var secret = "ThisIsOurLittleSecret.";  //just a long string which we will use for encryption
//---NOTE-- the above line should hv been there IF we did not want to encrypt our encryption key....BUT...since we have .env file for nvironment variables, we will define our secret(or encryption key) there----MUST see syntax of .env mongoose extension to understand what we wrote in .env file

//userSchema.plugin(encrypt, { secret: process.env.SECRET ,encryptedFields:["password"] }); //process.env.SECRET is to get password from the .env file //we are encrypting the PASSWORD ONLY!!!not the email.....if we wanted to encrypt ALL the fields, then NO need of (encryptedFields) wala statement.... //these 2 lines of (var secret) and (userSchema.pligin) MUST be above the (const User) line.....ie MUST be before we define the model
//the above line is removed once we have installed md5 for hashing.....since encryption ki zaroorat nahi ab...SEEDHA HASHING!!!!


//----MUST READ NEXT LINE------------
//whenever we save a new entry in database, like we did in app.post("/register",function) wala part, then while saving, encryption takes place.......AND.....whenever we find for an entry, like we did in app.post("/login",function) wala section, it automatically DECRYPTS!!!!


userSchema.plugin(passportLocalMongoose); //for passport and sessions
userSchema.plugin(findOrCreate); //plugin for findOrCreate


const User = new mongoose.model("User",userSchema);  //name of model is User and its entries would be named users


passport.use(User.createStrategy());  //this and the next 2 lines are for passport and sessions



passport.serializeUser(function(user, done) {  //to put info in cookies during the session
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {  //to destruct the cookies after the session
  User.findById(id, function(err, user) {
    done(err, user);
  });
});




//this part -------MUST BE BELOW serialize and deserialize part-------
passport.use(new GoogleStrategy({  //for the GoogleStrategy wala package......authenticate using passport-google-oauth20
    clientID: process.env.CLIENT_ID,    //check .env file
    clientSecret: process.env.CLIENT_SECRET,  //check .env file
    callbackURL: "http://localhost:3000/auth/google/secrets"  //the one we had put on passport-google-oauth20 in the 'Authorized redirect URIs' section.....would be the localhost:3000 wala at the time of testing
  },
  function(accessToken, refreshToken, profile, cb) { console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) { //FOR THIS DO------- npm i mongoose-findorcreate ----//we are finding if that googleId is present or not, if not then we create one, & if already present, we use that again to login/register the user WITHOUT creating another user in database///////SUPER IMP!!!!!!!!!!!!
      return cb(err, user);
    });
  }
));





app.get("/",function(req,res){  //get is similar to read in CRUD operstions
  res.render("home");  // no forward slash is required for rendering
});


app.route('/auth/google')   //where the button directs us.....allows sign in with google....now we can choose our id from which we can register/login
  .get(passport.authenticate('google', {
    scope: ['profile']
}));



//-----the code below is used to redirect user to secrets page once we have logged in using google---------
app.get('/auth/google/secrets', //remember this is what we had typed in our google api for passport-google-oauth20  // see we have written the same url in another section of this code
  passport.authenticate('google', { failureRedirect: '/login' }),  //if authentication fails, redirect to login
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });



app.get("/login",function(req,res){
  res.render("login");    // no forward slash is required for rendering
});

app.get("/register",function(req,res){
  res.render("register");     // no forward slash is required for rendering
});

app.get("/secrets", function(req, res){
  User.find({ "secret":{$ne:null} } , function(err , foundUsersWithSecrets){   //we are finding a user whose secret field is NOT null/empty...."secret":{$ne:null}...ie he has submitted a secret...so that we can display everyones secret this way on the secrets page
    if(err){
      console.log(err);
    }else{
      if(foundUsersWithSecrets){   //if we find such a user,then we will render the secrets page
        res.render("secrets", {usersWithSecrets:foundUsersWithSecrets});  //see for usersWithSecrets in secrets.ejs
      }
    }
  });
});




app.get("/submit", function(req, res){  //get route for SUBMIT
  if (req.isAuthenticated()){
    res.render("submit");    //if login or register req is correct, take to submit page
  } else {
    res.redirect("/login");   //if login was incorrect, make them do it again
  }
});


app.post("/submit" , function(req,res){ //post route for SUBMIT
  const submittedSecret = req.body.secret;   //see submit.ejs
  User.findById( req.user.id , function(err, foundUser){   //NOT req.body.id
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");  //after saving, redirect to secrets
        });
      }
    }
  });
});




app.get("/logout", function(req, res){
  req.logout();   //logout using passport,,,,but cookie is saved and until we close the tab/session, we can directly go to secrets page by modifying the url
  res.redirect("/");
});



app.post("/register",function(req,res){   //post is similar to create in CRUD.......here we are creating an entry of email and password from the register page into our databade

  // bcrypt.hash(req.body.userKaPasswordForRegister, saltRounds, function(err, hash) {  //this is used to bcrypt
  //
  //   const newUser = new User({
  //     email:req.body.userKaNameForRegister,
  //     // password:md5(req.body.userKaPasswordForRegister) //we have put the md5() for hashing the password
  //     password:hash //once we have used bcrypt.hash....then we replace above line with this one
  //   });
  //   newUser.save(function(err){   //password encrypted on saving
  //     if(!err){
  //       res.render("secrets");     // no forward slash is required for rendering
  //     }else{
  //       console.log(err);
  //     }
  //   });
  //
  // });//bcrypt ends

  //DELETE EVERYTHING IN REGISTER ROUTE ONCE WE START USING PASSPORT

  User.register({username: req.body.username}, req.body.password, function(err, user){   //this one is for passport ke through registration
   if (err) {
     console.log(err);
     res.redirect("/register");  //if err...redirect to register page
   } else {
     passport.authenticate("local")(req, res, function(){
       res.redirect("/secrets");   //if authentication goes well...redirect to secrets page
     });
   }
 });


});



//
// app.post("/login",function(req,res){
//   // const checkEmail = req.body.usernameForLogin;
//   // // const checkPassword = md5(req.body.passwordForLogin);  //delete this line once we use bcrypt...no need of matching with md5 now
//   // const checkPassword = req.body.passwordForLogin; //use this for bcrypt purpose
//   //
//   // User.findOne({email:checkEmail} , function(err, foundUser){  //finding a user with email===checkEmail....if found, then that entry was foundUser
//   //   if(err){                 //password decrypted on finding
//   //     console.log(err);
//   //   }else{
//   //     if(foundUser){
//   //       // if(foundUser.password===checkPassword){  //delete this once we start using bcrypt
//   //       //   res.render("secrets");
//   //       // }
//   //       bcrypt.compare(checkPassword, foundUser.password, function(err, result) {  //bcrypt to compare password at time of login
//   //         if(result===true){
//   //           res.render("secrets");
//   //         }
//   //       });
//   //     }
//   //   }
//   // });
//
// //DELETE EVERYTHING IN LOGIN ROUTE ONCE WE START USING PASSPORT
//
//   const user = new User({
//      username: req.body.username,
//      password: req.body.password
//    });
//
//    req.login(user, function(err){   //this part is from passport
//      if (err){
//        console.log(err);
//      } else {
//        passport.authenticate("local")(req, res, function(){
//          res.redirect("/secrets");  //if authentication goes well...redirect to secrets page
//        });
//      }
//    });
//
// });



// use this for login using passport..........----upar wale mei error hai-----

app.post("/login", function(req, res){
  //check the DB to see if the username that was used to login exists in the DB
  User.findOne({username: req.body.username}, function(err, foundUser){
    //if username is found in the database, create an object called "user" that will store the username and password that was used to login
    if(foundUser){
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
      //use the "user" object that was just created to check against the username and password in the database
      //in this case below, "user" will either return a "false" boolean value if it doesn't match, or it will
      //return the user found in the database
      passport.authenticate("local", function(err, user){
        if(err){
          console.log(err);
        } else {
          //this is the "user" returned from the passport.authenticate callback, which will be either
          //a false boolean value if no it didn't match the username and password or
          //a the user that was found, which would make it a truthy statement
          if(user){
            //if true, then log the user in, else redirect to login page
            req.login(user, function(err){
            res.redirect("/secrets");
            });
          } else {
            res.redirect("/login");
          }
        }
      })(req, res);
    //if no username is found at all, redirect to login page.
    } else {//user does not exists
      res.redirect("/login")
    }
  });
});




app.listen(3000, function(){
  console.log("server started on 3000");
});
