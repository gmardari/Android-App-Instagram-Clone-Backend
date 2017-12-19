
(function() {
    var util = require('util');
    

    module.exports.printText = function(text) {
        console.log(text);
    }

    module.exports.runQuery = function(pool, q, next)
    {
    	 //const results = [];
		  // Get a Postgres client from the connection pool
          /*
		  pool.connect( (err, client, done) => {
		    // Handle connection errors
		    if(err) {
		      done();
		      console.log(err);
		      next(err);
		      return;
		    }
		    // SQL Query > Select Data
		   // const query = client.query(q);
		    var query = client.query(q, function(err, results)
		    {
		    	done();
			    if(err) 
                {
			         return console.error('error running query', err);
			    }
			    next(err, results);
		    });


		  });
        */

            /*
            pool.connect().then(client => {
              client.query(q).then(res => {
                //client.release();
                next(null, res);
              })
              .catch(e => {
                 //client.release();
                //console.error('query error', e.message, e.stack);
                next(e, null);
              })
            });
            */
            pool.query(q, function(err, res)
            {
                next(err, res);
            });

    }

    module.exports.runParamQuery = function(pool, q, params, next)
    {
        console.log('run query params ' + params);
          pool.query(q, params, function(err, res)
            {
                next(err, res);
            });


          
    }

    module.exports.getUserData = function(pool, userdata, next)
    {
    	var userid = userdata.userid;
    	var username = userdata.username;
    	//Retrieve user data based off given userid
    	if(userid != null)
    	{
    		module.exports.runQuery(pool, util.format("SELECT * FROM users WHERE id='%d';", userid), function(err, results)
    		{
    			if(err)
    			{
    				next(err);
    				return;
    			}

    			if(results.rows.length > 0)
		        {
		            var user = results.rows[0];
		            next(err, user);
		            return;
		        }
		        else
		        {
		        	next(err, null);
		        	return;
		        }
    		});
    	}
    	else if(username != null)
    	{
    		module.exports.runQuery(pool, util.format("SELECT * FROM users WHERE lower(username) = '%s';", username.toLowerCase()), function(err, results)
    		{
    			if(err)
    			{
    				next(err);
    				return;
    			}

    			if(results.rows.length > 0)
		        {
		            var user = results.rows[0];
		            next(err, user);
		        }
		       	else
		        {
		        	next(err, null);
		        	return;
		        }
    		});
    	}
    }

    module.exports.insertRow = function(pool, data, next)
    {
    	var columnNames = "";
    	var columnValues = "";
    	for(var i in data)
    	{

    	}
    	/*
    	pool.connect( (err, client, done) => {
    		if(err) {
		      done();
		      console.log(err);
		      next(err);
		      return;
		    }
		    var tableName = data.tableName;

		    var query = "";

    	});
		*/
    }

    //Run multiple queries. Each function must return one query to run for the next functions
    module.exports.runMultiQueries = function(pool, fx, next, q, e, r)
    {
        var queries = [];
        if(q && q.length > 0)
            queries = q;

        var query =  fx[0](e, r);
        fx.splice(0, 1);
        if(query)
        {
            queries.push(query);

                
            module.exports.runQuery(pool, query, function(err, results)
            {
                if(fx.length > 0)
                {
                   module.exports.runMultiQueries(pool, fx, next, queries, err, results);
                }
                else
                {
                    next(queries, err, results);
                    return;
                }
            });
            
        }
        else
        {
            next(queries, e, r);
        }
        


    }



    module.exports.createContentPost = function(pool, data, next)
    {
    	if(data)
    	{
    		var query = util.format("INSERT INTO contentposts (uid, owner_id, content_url, content_type, bio, post_date) VALUES ('%s', %d, '%s', '%s', '%s', TIMESTAMP '%s');", data.uid, data.owner_id, data.content_url, data.content_type, data.bio, data.post_date);
    		console.log(query);
    		if(query)
    		{
    			module.exports.runQuery(pool, query, function(err, results)
    			{
    				if(err)
	    			{
	    				next(err);
	    				return;
	    			}

	    			next(err, results);

    			});
    		}
    	}
    	
    }

    module.exports.getContentPosts = function(pool, next)
    {
    	var query = "SELECT contentposts.*, users.username AS owner_name FROM contentposts JOIN users ON contentposts.owner_id = users.id;"
    	//console.log(query);
    	if(query)
    	{
    		module.exports.runQuery(pool, query, function(err, results)
    		{
    			if(err)
	    		{
	    			next(err);
	    			return;
	    		}

	    		if(results.rows && results.rows.length > 0)
	    		{
	    			next(err, results.rows);
	    		}
	    		else
	    		{
	    			next(err, null);
	    		}
	    		

    		});
    	}
    }

    module.exports.setPostInteraction = function(pool, data, next)
    {
    	var query = null;
        var params = [];

    	if(data.interaction == "like")
    	{

            query = "INSERT INTO post_interactions (postid, userid, islike) VALUES($1, $2, $3) ON CONFLICT(postid, userid) DO UPDATE SET islike = $3";
            params = [data.postid, data.userid, data.value];
    			//query = util.format("BEGIN; INSERT INTO post_likes VALUES (%d, %d); UPDATE contentposts SET likes = likes + 1 WHERE id = %d; COMMIT;", data.userid, data.postid, data.postid);
    			

    	}
    	else if(data.interaction == 'favourite')
    	{
    		if(data.value)
    		{
    			query = util.format("BEGIN; INSERT INTO post_favourites VALUES (%d, %d); UPDATE contentposts SET favourites = favourites + 1 WHERE id = %d; COMMIT;", data.userid, data.postid, data.postid);
    		}	
    		else
    		{
    			query = util.format("BEGIN; DELETE FROM post_favourites WHERE userid = %d AND postid = %d; UPDATE contentposts SET favourites = favourites - 1 WHERE id = %d; COMMIT;", data.userid, data.postid, data.postid);
    		}
    	}
    	else if(data.interaction == 'view')
    	{
	    	if(data.value)
	    	{
	    		query = util.format("BEGIN; INSERT INTO post_views VALUES (%d, %d); UPDATE contentposts SET views = views + 1 WHERE id = %d; COMMIT;", data.userid, data.postid, data.postid);
	    	}
	    	else
	    	{
	    		query = util.format("BEGIN; DELETE FROM post_views WHERE userid = %d AND postid = %d; UPDATE contentposts SET views = views - 1 WHERE id = %d; COMMIT;", data.userid, data.postid, data.postid);
	    	}
    	}

    	console.log(query);
        //console.log(params);

    	if(query && params)
    	{
    		module.exports.runParamQuery(pool, query, params, function(err, results)
    		{
    			if(err)
	    		{
	    			next(err);
	    			return;
	    		}

	    		next(err, results);
	    		return;
    		});
    	}
    	else
    	{
    		next(true, null);
    	}
    }

   

}());
