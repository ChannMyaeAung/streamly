package main

import (
	"fmt"

	"github.com/ChannMyaeAung/streamly/server/database"
	"github.com/ChannMyaeAung/streamly/server/routes"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func main() {
	router := gin.Default()
	router.GET("/hello", func(c *gin.Context) {
		c.JSON(200, "Hello, streamly!")
	})

	err := godotenv.Load(".env")
	if err != nil {
		fmt.Println("Error loading .env file")
	}

	var client *mongo.Client = database.Connect()

	routes.SetUpUnProtectedRoutes(router, client)
	routes.SetUpProtectedRoutes(router, client)

	if err := router.Run(":8080"); err != nil {
		fmt.Println("Failed to start server:", err)
	}
}
