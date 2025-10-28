package main

import (
	"fmt"

	controller "github.com/ChannMyaeAung/streamly/server/controllers"
	"github.com/ChannMyaeAung/streamly/server/database"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func main() {
	router := gin.Default()
	router.GET("/hello", func(c *gin.Context) {
		c.JSON(200, "Hello, streamly!")
	})

	var client *mongo.Client = database.Connect()

	router.GET("/movies", controller.GetMovies(client))
	router.GET("/movie/:imdb_id", controller.GetMovie(client))
	router.POST("/addmovie", controller.AddMovie(client))

	if err := router.Run(":8080"); err != nil {
		fmt.Println("Failed to start server:", err)
	}
}
