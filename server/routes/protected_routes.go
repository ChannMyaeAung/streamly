package routes

import (
	controller "github.com/ChannMyaeAung/streamly/server/controllers"
	"github.com/ChannMyaeAung/streamly/server/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func SetUpProtectedRoutes(router *gin.Engine, client *mongo.Client) {
	router.Use(middleware.AuthMiddleware())

	router.GET("/movie/:imdb_id", controller.GetMovie(client))
	router.POST("/addmovie", controller.AddMovie(client))
}
