# Android-App-Instagram-Clone-Backend
The Nodejs implementation of the backend.

<h2>Data Structures</h2>

Here's a breakdown of the data structures in the database: 

ContentPost

	Owner – UserTag
	ContentId : String
	ContentType – Enum
	ContentMedia : String
	Bio : String
	TotalLikes - Integer
	TotalFavourites - Integer
	TotalShares – Integer
	-Local
	IsLike : Boolean
	IsFavourite : Boolean
	GET list_like() returns Array[UserTag]
	GET list_favourites() returns Array[UserTag] 
UserTag

	Name : String
	Photo : String 
User

	UserId : String
	Name : String
	 About : String
	Photo : String
	TotalPosts : Integer
	TotalFollowers : Integer
	TotalFollowing : Integer
	Email : String
	Phone : String
	Content : Array[String]
	TaggedContent : Array[String]
	QueuedTagContent : Array[String]

<h2>Data</h2>

Stores images and other data to be retrieved by users in a file system located by '/public/content/'

<h2>Software Implementation</h2>
  
<h3>main.js</h3>
Stores information about the database, manages all database resources, and routes every api service (e.g. '/helloworld', '/login', etc) to a specific function that sends a SQL query to the database and retrieves or stores any relevant information. Uses JSON web tokens to retrieve information from users that launched the api service; information such as their userid. The webtokens are encoded with a secret password, and decoded on the backend (the encryption is easy to break so no sensitive information is sent over this token). 
  
<h3>test.js</h3>
Handles the operations to run a query on the database, get user data, create content posts, and implements other needed database interactions.


