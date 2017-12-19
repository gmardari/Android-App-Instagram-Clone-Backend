var express = require("express")
var app = express()
var apiRoutes = express.Router()
var bodyParser = require('body-parser');
var fs = require("fs");
var shortid = require('shortid');
var util = require('util');
var test = require('./test');
var pg = require('pg');
var Pool = require('pg-pool')
var jwt = require('jsonwebtoken');
var multer  = require('multer');
var userupload = multer({ dest: 'public/content/user/' });
var timeout = require('connect-timeout');
const dbConnString = process.env.DATABASE_URL || 'postgres://localhost:5432/testdb';

var config = {
  user: 'Owner', //env var: PGUSER 
  database: 'testdb', //env var: PGDATABASE 
  password: '', //env var: PGPASSWORD 
  host: 'localhost', // Server hosting the postgres database 
  port: 5432, //env var: PGPORT 
  max: 30, // max number of clients in the pool 
  idleTimeoutMillis: 20000, // how long a client is allowed to remain idle before being closed 
};

var VIOLATIONS = { UNIQUE : 23505};

var pool = new Pool(config);
var MIN_USER_CHARS = 3;
var MIN_PASSWORD_CHARS = 6;
var MIN_NAME_CHARS = 3;
var MIN_PHONE_CHARS = 5;
var MIN_EMAIL_CHARS = 10;
var MIN_DOB_CHARS = 8;

app.use(timeout(5000));
app.set('secret', '#o5-R[+%4Wyp$Ef')
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(function(err, req, res, next) {

  // error handling logic
  console.error(err.stack);
  res.status(500).send('Something broke!');

});



app.get('/', function(req, res)
{
	
	res.type('html');
	res.send("<h1>Nodejs server</h1>");
});



app.get('/content/user/:name', function(req, res)
{
	var options = {
    root: __dirname + '/public/content/user/',
    dotfiles: 'deny',
    headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
    	}
  	};

  	var fileName = req.params.name;

  	if(fs.existsSync(options.root + fileName))
  	{
      //res.type('image');
  		res.sendFile(fileName, options, function (err) {
		    if (err) 
		    {
		      console.log(err);
		      res.status(err.status).end();
		    }
		    else 
		    {
		      console.log('Sent:', fileName);
		    }
		});
  	}
  	else
  	{
  		res.status(404).end("Content not found");
  	}
	
  
});

apiRoutes.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.get('Authorization');

  // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, app.get('secret'), function(err, decoded) {      
      if (err) {
        console.log("Middleware cannot decode token");
        next();
        return;    
      } else {
        // if everything is good, save to request for use in other routes
        //console.log("Middleware successfully decoded token");
        req.decoded = decoded;    
        next();
      }
    });

  } else {
    next();
    return;
  }
});



apiRoutes.get('/helloworld', function(req, res)
{

  res.type('application/json');
  res.json({ message : "Hello client!" });
})

apiRoutes.post('/login', bodyParser.json(), function(req, res)
{
	console.log("Content-type: " + req.get("Content-Type"));
	console.log("Credentials: " + req.body.username + " : " + req.body.password);
  res.type("application/json");
  if( (req.body.username && req.body.password) && req.body.username.length >= MIN_USER_CHARS && req.body.password.length >= MIN_PASSWORD_CHARS)
  {
      var username = req.body.username.toLowerCase();
      test.runQuery(pool, util.format("SELECT * FROM users WHERE username='%s';", username), function(err, results) 
        {
          
         
          if(err)
          {
            console.log("Error: " + err);
            res.json(err);
            return;
          }
          console.log(JSON.stringify(results, null, 2));
            //console.log(results[0]);
          if(results.rows.length > 0)
          {
            var user = results.rows[0];
            if(user.password === req.body.password)
            {
              var token = jwt.sign( { userid: user.id, username: user.username, email : user.email }, app.get('secret'), {
                expiresIn: "1h"
              });
              res.json({ login : true, credentials : "match", username: user.username, usertoken : token } );
              return;
            }
          }

          res.json({ login : false, credentials : "mismatch"});
        });
      
  }
  else
  {
    res.json({ login : false, credentials : "invalid"});
  }
	
});

apiRoutes.post('/register', bodyParser.json(), function(req, res)
{
  console.log("Call to /register \nContent type: " + req.get("Content-Type"));
  var firstName = req.body.firstname;
  var lastName = req.body.lastname;
  var email = req.body.email;
  var username = req.body.username;
  var password = req.body.password;
  var dob = req.body.dob;
  var phone = req.body.phone;

  res.type('application/json');

  if(firstName && lastName && email && username && password && dob && phone)
  {
    if(username.length >= MIN_USER_CHARS && password.length >= MIN_PASSWORD_CHARS && email.length >= MIN_EMAIL_CHARS && dob.length >= MIN_DOB_CHARS && phone.length >= MIN_PHONE_CHARS)
    {
        //Check to see if username already exists
        test.runQuery(pool, util.format("SELECT * FROM users WHERE username='%s';", username), function(err, results)
        {
          if(err)
          {
            console.log("Error: " + err);
            res.json(err);
            return;
          }

          if(results.rows.length > 0)
          {
            var user = results.rows[0];
            if(user)
            {
              res.json({ registered: false, credentials: "usertaken" } );
              return;
            }
          }
          else
          {
            test.runQuery(pool, util.format("INSERT INTO users (username, password, firstname, lastname, email, dob, phone) VALUES ('%s','%s','%s','%s','%s', to_date('%s', 'MM-DD-YYYY'),'%s');", username, password, firstName, lastName, email, dob, phone), 
            function(err, results)
            {
              if(err)
              {
                console.log("Error: " + err);
                res.json(err);
                return;
              }
              
              console.log(JSON.stringify(results, null, 2));
              registered = true;
              res.json( { registered : true, credentials : "valid", username : username} );
              return;
            });

          }

        });
      return;
    }
    else
    {
      console.log("Invalid parameters");
    }
  }
  else
  {
    console.log("Null paramaters");
  }

  
  res.json({  registered: false, credentials: "invalid" });
});

apiRoutes.get('/profile', bodyParser.json(), function(req, res)
{
    if(req.decoded)
    {
      console.log("User token decoded:");
      console.log(JSON.stringify(req.decoded, null, 2));
      res.type('application/json');
      test.getUserData(pool, { userid: req.decoded.userid }, function(err, user)
      {
        if(err)
        {
          res.status(500).end();
          return;
        } 
        if(user == null)
        {
          res.status(404).end();
          return;
        }
        res.json( {username : user.username, posts : user.posts, followers : user.followers, following : user.following, firstname : user.firstname, lastname : user.lastname, bio : user.bio} );
      });
      //res.json( {username : req.decoded.username, userid: req.decoded.userid, email: req.decoded.email });
    }
    else
    {
      console.log("User token not decoded");
      res.status(400).end();
    }
});

apiRoutes.get('/feed', bodyParser.json(), function(req, res)
{



  if(req.decoded)
  {
    //console.log("Sending user his feed...");
    test.getContentPosts(pool, function(err, rows)
    {
      if(err)
      {
        console.log("Error retrieving feed");
        res.status(500).end();
        return;
      }

      if(rows && rows.length > 0)
      {

        var arr = [];
        for(var i = 0; (i < rows.length) && (i < 10); i++)
        {
            var row = rows[rows.length - i - 1];
            arr[i] = row;
        }

        test.runQuery(pool, "SELECT postid, COUNT(islike) FROM post_interactions WHERE islike=true GROUP BY postid ORDER BY postid;", function(err, results)
        {
          if(err)
          {
            console.log("Error retrieving feed");
            res.status(500).end();
            return;
          }

          if(res)
          {
            for(var i = 0; i < arr.length; i++)
            {
              arr[i].likes = 0;
              for(var k = 0; k < results.rows.length; k++)
              {
                var row = results.rows[k];
                if(arr[i].id == row.postid)
                {
                  arr[i].likes = Number(row.count);
                  break;
                }
              }
            }
            res.json( { content : arr });
          }
        });

        //console.log(JSON.stringify(arr, null, 2));
        
        return;
      }

      res.json( {content : [] } );
    });
   // res.json( { content : [{ ownerid : 1, ownername: "darian", ownerprofile : "users/profile/fake.png", url : "background.jpg", type : "image", totallikes: 173, totalfavourites: 0, totalshares : 0, bio : "Beautiful HD background, contact me to buy this background that I ripped off the internet.", postdate: "08/04/1999", views : 0 },
  //   { ownerid : 2, ownername: "ernest", ownerprofile : "users/profile/fake.png", url : "ernest_derp.png", type : "image", totallikes: 69, totalfavourites: 0, totalshares : 0, bio : "Whats up pimps?", postdate: "08/04/1999", views : 0 }] } );
  }
});

apiRoutes.put('/upload', userupload.single('image'), bodyParser.json(), function(req, res)
{
  console.log("Upload!");
  console.log(req.file);
  console.log(req.body);

  var data = JSON.parse(req.body.data);

  if(req.decoded)
  {
    if(req.body)
    {
      if(data)
      {


        if(req.file)
        {
          var uid = shortid.generate();
          var url = 'user/' + req.file.filename;
          var post_date = '2000-01-01 00:00:00';
          var caption = data.caption;
          var toggle_comments = data.toggle_comments;
          console.log(caption + " " + toggle_comments);

          test.createContentPost(pool, { uid: uid, owner_id : req.decoded.userid, content_url : url, content_type : 'image', bio : caption, post_date : post_date}, function(err, results)
          {
              if(err)
              {
                console.log("Failed to create content post : ");
                console.log(err);
                return;
              }

              console.log(JSON.stringify(results, null, 2));
          });

          res.json( { size : req.file.size, result : "success" });
          return;
        }
        else
        {
          res.status(400).json( { result : "imagenull" });
          return;
        }
      }
    }

    res.status(400).json( { result : "nodata" });
    return;
  }
  else
  {

    res.status(400).json( { result : "nocreds" });
  }
  
});

//Interact with an existing post
apiRoutes.post('/post/:id', bodyParser.json(), function(req, res)
{
  var id = Number(req.params.id);

  if(id && id > 0 && req.decoded && req.body)
  {
    var userid = req.decoded.userid;
    var interaction = req.body.interaction;
    var value = req.body.value;

    if(interaction == "like")
    {
      test.setPostInteraction(pool, { interaction : interaction, value : value, userid : userid, postid : id}, function(err, results)
      {
          if(err)
          {
            console.log("Error running query in post interaction");
            if(err.code == VIOLATIONS.UNIQUE)
            {
              res.set("Connection", "close");
              res.status(409).end();
             
            }
            return;
          }

          //console.log(results);
          res.json( { postid : id, interaction : interaction, value : value } );
      });
    }
    else if(interaction == "favourite")
    {
        test.setPostInteraction(pool, { interaction : interaction, value : value, userid : userid, postid : id}, function(err, results)
      {
          if(err)
          {
            console.log("Error running query in post interaction");
            if(err.code == VIOLATIONS.UNIQUE)
            {
              res.set("Connection", "close");
              res.status(409).end();
             
            }
            return;
          }

          //console.log(results);
          res.json( { postid : id, interaction : interaction, value : value } );
      });
    }
    else if(interaction == "view")
    {
      test.setPostInteraction(pool, { interaction : interaction, value : true, userid : userid, postid : id}, function(err, results)
      {
          if(err)
          {
            console.log("Error running query in post interaction");
            if(err.code == VIOLATIONS.UNIQUE)
            {
              res.set("Connection", "close");
              res.status(409).end();
            }
            return;
          }

          //res.json( { postid : id, interaction : interaction, value : true } );
          console.log(results);
      });
    }

    return;
  }

  res.set("Connection", "close");
  res.status(403).end();
});


function fileFilter (req, file, cb) 
{
  console.log("File Filter working");

  cb(null, true)

}

app.use('/api', apiRoutes);
app.use(haltOnTimedout);

function haltOnTimedout(req, res, next)
{
  if (!req.timedout) next();
}


pool.on('error', function (err, client) {
  // if an error is encountered by a client while it sits idle in the pool 
  // the pool itself will emit an error event with both the error and 
  // the client which emitted the original error 
  // this is a rare occurrence but can happen if there is a network partition 
  // between your application and the database, the database restarts, etc. 
  // and so you might want to handle it and at least log it out 
  console.error('idle client error', err.message, err.stack)
});

var server = app.listen(80, "192.168.0.170", function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Server listening at http://%s:%s", host, port)

 
});

