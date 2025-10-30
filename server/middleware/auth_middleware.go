package middleware

import (
	"net/http"

	"github.com/ChannMyaeAung/streamly/server/utils"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware extracts, validates, and attaches JWT claims before protected handlers run.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Pull the bearer token off the request; bail if we cannot read it.
		token, err := utils.GetAccessToken(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		// Reject requests that omit the Authorization header entirely.
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No token provided"})
			return
		}

		// Parse and verify the JWT; any failure means the caller is not authenticated.
		claims, err := utils.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Stash user identity details for downstream handlers to read from context without reparsing the token.
		c.Set("userId", claims.UserId)
		c.Set("role", claims.Role)

		c.Next()
	}
}
