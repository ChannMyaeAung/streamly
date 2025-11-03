package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/ChannMyaeAung/streamly/server/database"
	"github.com/ChannMyaeAung/streamly/server/routes"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func main() {
	// gin.Default() wires in the standard logger and recovery middleware.
	router := gin.Default()

	// Load environment variables early; the service relies on DB, JWT, and CORS settings.
	err := godotenv.Load(".env")
	if err != nil {
		fmt.Println("Error loading .env file")
	}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")

	var origins []string
	if allowedOrigins != "" {
		origins = strings.Split(allowedOrigins, ",")
		for i := range origins {
			origins[i] = strings.TrimSpace(origins[i])
			log.Println("Allowed Origin:", origins[i])
		}
	} else {
		origins = []string{"http://localhost:5173"}
		log.Println("Allowed Origin: http://localhost:5173")
	}

	config := cors.Config{}
	config.AllowOrigins = origins
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true
	config.MaxAge = 12 * time.Hour

	// wraps the router with the cors policies, so every request enforces the cross-origin rules before hitting the handlers.
	router.Use(cors.New(config))
	router.Use(gin.Logger())

	var client *mongo.Client = database.Connect()

	// Confirm the driver can reach MongoDB before serving traffic.
	if err := client.Ping(context.Background(), nil); err != nil {
		log.Fatal("Failed to reach server: ", err)
	}

	// Close the Mongo client on shutdown to avoid leaking connections.
	defer func() {
		err := client.Disconnect(context.Background())
		if err != nil {
			log.Fatal("Error disconnecting from the server: ", err)
		}
	}()

	routes.SetUpUnProtectedRoutes(router, client)
	routes.SetUpProtectedRoutes(router, client)

	// Block here and start listening for incoming HTTP traffic.
	if err := router.Run(":8080"); err != nil {
		fmt.Println("Failed to start server:", err)
	}
}
