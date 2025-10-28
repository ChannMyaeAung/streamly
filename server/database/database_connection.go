package database

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func Connect() *mongo.Client{
	err := godotenv.Load(".env")
	if err != nil{
		log.Println("Error loading .env file")
	}
	MongoDb := os.Getenv("MONGODB_URI")
	if MongoDb == ""{
		log.Fatal("MONGODB_URI not found in environment variables")
	}
	fmt.Println("MongoDB URI:", MongoDb)

	clientOptions := options.Client().ApplyURI(MongoDb)
	client, err := mongo.Connect(clientOptions)
	if err != nil {
		log.Fatal("Error connecting to MongoDB:", err)
	}
	return client
}

// Loads the database name from env and returns the requested collection handle from the provided client.
func OpenCollection(collectionName string, client *mongo.Client) *mongo.Collection{
	err := godotenv.Load(".env")
	if err != nil{
		log.Println("Error loading .env file")
	}
	databaseName := os.Getenv("DATABASE_NAME")
	if databaseName == ""{
		log.Fatal("DATABASE_NAME not found in environment variables")
	}
	collection := client.Database(databaseName).Collection(collectionName)

	if collection == nil{
		return nil
	}
	return collection
}