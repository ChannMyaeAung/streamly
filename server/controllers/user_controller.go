package controllers

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/ChannMyaeAung/streamly/server/database"
	"github.com/ChannMyaeAung/streamly/server/models"
	"github.com/ChannMyaeAung/streamly/server/utils"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	HashPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(HashPassword), nil
}

func RegisterUser(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var user models.User

		if err := c.ShouldBindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		validate := validator.New()

		if err := validate.Struct(user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"validation_error": err.Error()})
			return
		}

		hashedPassword, err := HashPassword(user.Password)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while hashing password"})
			return
		}

		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var userCollection *mongo.Collection = database.OpenCollection("users", client)

		// Check if user with the same email already exists
		count, err := userCollection.CountDocuments(ctx, bson.M{"email": user.Email})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while checking for existing user"})
			return
		}
		if count > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
			return
		}
		user.UserID = bson.NewObjectID().Hex()
		user.Password = hashedPassword
		user.CreatedAt = time.Now()
		user.UpdatedAt = time.Now()

		result, err := userCollection.InsertOne(ctx, user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while creating user"})
			return
		}

		c.JSON(http.StatusCreated, result)
	}
}

func LoginUser(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var userLogin models.UserLogin

		if err := c.ShouldBindJSON(&userLogin); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var userCollection *mongo.Collection = database.OpenCollection("users", client)

		var foundUser models.User
		err := userCollection.FindOne(ctx, bson.M{"email": userLogin.Email}).Decode(&foundUser)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}

		err = bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(userLogin.Password))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}

		token, refreshToken, err := utils.GenerateAllTokens(foundUser.Email, foundUser.FirstName, foundUser.LastName, foundUser.Role, foundUser.UserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while generating tokens"})
			return
		}

		err = utils.UpdateAllTokens(foundUser.UserID, token, refreshToken, client)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while updating tokens"})
			return
		}

		// Mark cookies as Secure and SameSite=None for cross-site requests
		// tokens can't be read by client-side JS mitigating XSS risks due to HttpOnly
		// SameSite=None allows cross-site cookie usage
		// only travel over HTTPS due to Secure flag
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "access_token",
			Value:    token,
			Path:     "/",
			Domain:   "localhost",
			MaxAge:   86400,
			Secure:   true,
			HttpOnly: true,
			SameSite: http.SameSiteNoneMode,
		})
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "refresh_token",
			Value:    refreshToken,
			Path:     "/",
			Domain:   "localhost",
			MaxAge:   604800,
			Secure:   true,
			HttpOnly: true,
			SameSite: http.SameSiteNoneMode,
		})

		c.JSON(http.StatusOK, models.UserResponse{
			UserID:          foundUser.UserID,
			FirstName:       foundUser.FirstName,
			LastName:        foundUser.LastName,
			Email:           foundUser.Email,
			Role:            foundUser.Role,
			Token:           token,
			RefreshToken:    refreshToken,
			FavouriteGenres: foundUser.FavouriteGenres,
		})
	}
}

func LogoutHandler(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Clear the access token cookie
		var UserLogout struct {
			UserId string `json:"user_id"`
		}

		err := c.ShouldBindJSON(&UserLogout)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
			return
		}

		fmt.Println("User ID from Logout request:", UserLogout.UserId)

		err = utils.UpdateAllTokens(UserLogout.UserId, "", "", client) // Clear tokens in the database

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while logging out"})
			return
		}
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "access_token",
			Value:    "",
			Path:     "/",
			Domain:   "localhost",
			MaxAge:   -1,
			Secure:   true,
			HttpOnly: true,
			SameSite: http.SameSiteNoneMode,
		})

		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "refresh_token",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			Secure:   true,
			HttpOnly: true,
			SameSite: http.SameSiteNoneMode,
		})

		c.JSON(http.StatusOK, gin.H{"message": "Successfully logged out"})
	}
}

// DemoLogin issues tokens for a pre-seeded demo account without requiring a password.
// It resolves the account by looking up the email stored in DEMO_ADMIN_EMAIL or DEMO_USER_EMAIL
// based on the requested demo type ("admin" or "user").
func DemoLogin(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Type string `json:"type"`
		}

		if err := c.ShouldBindJSON(&req); err != nil || (req.Type != "admin" && req.Type != "user") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "type must be \"admin\" or \"user\""})
			return
		}

		var email string
		if req.Type == "admin" {
			email = os.Getenv("DEMO_ADMIN_EMAIL")
		} else {
			email = os.Getenv("DEMO_USER_EMAIL")
		}

		if email == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Demo accounts are not configured on this server"})
			return
		}

		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var userCollection *mongo.Collection = database.OpenCollection("users", client)

		var foundUser models.User
		if err := userCollection.FindOne(ctx, bson.M{"email": email}).Decode(&foundUser); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Demo account not found. Ensure the database has been seeded."})
			return
		}

		token, refreshToken, err := utils.GenerateAllTokens(foundUser.Email, foundUser.FirstName, foundUser.LastName, foundUser.Role, foundUser.UserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while generating tokens"})
			return
		}

		if err = utils.UpdateAllTokens(foundUser.UserID, token, refreshToken, client); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while updating tokens"})
			return
		}

		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "access_token",
			Value:    token,
			Path:     "/",
			Domain:   "localhost",
			MaxAge:   86400,
			Secure:   true,
			HttpOnly: true,
			SameSite: http.SameSiteNoneMode,
		})
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "refresh_token",
			Value:    refreshToken,
			Path:     "/",
			Domain:   "localhost",
			MaxAge:   604800,
			Secure:   true,
			HttpOnly: true,
			SameSite: http.SameSiteNoneMode,
		})

		c.JSON(http.StatusOK, models.UserResponse{
			UserID:          foundUser.UserID,
			FirstName:       foundUser.FirstName,
			LastName:        foundUser.LastName,
			Email:           foundUser.Email,
			Role:            foundUser.Role,
			Token:           token,
			RefreshToken:    refreshToken,
			FavouriteGenres: foundUser.FavouriteGenres,
		})
	}
}

// RefreshTokenHandler rotates the access/refresh token pair when the client presents a valid refresh cookie.
func RefreshTokenHandler(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		// Pull refresh token from the secure cookie; without it we cannot mint new credentials.
		refreshToken, err := c.Cookie("refresh_token")
		if err != nil {
			fmt.Println("error", err.Error())
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No refresh token provided"})
			return
		}

		// Validate signature + expiry to ensure the presented refresh token is trustworthy.
		claim, err := utils.ValidateRefreshToken(refreshToken)
		if err != nil || claim == nil {
			fmt.Println("error", err.Error())
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
			return
		}

		var userCollection *mongo.Collection = database.OpenCollection("users", client)

		var user models.User
		// Confirm the user still exists and retrieve their latest details before issuing new tokens.
		err = userCollection.FindOne(ctx, bson.D{{Key: "user_id", Value: claim.UserId}}).Decode(&user)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		// Rotate tokens: mint new access + refresh and persist them for logout/blacklist checks.
		newToken, newRefreshToken, _ := utils.GenerateAllTokens(user.Email, user.FirstName, user.LastName, user.Role, user.UserID)
		err = utils.UpdateAllTokens(user.UserID, newToken, newRefreshToken, client)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while updating tokens"})
			return
		}

		// Ship the fresh tokens back via secure cookies so the browser automatically uses them.
		c.SetCookie("access_token", newToken, 86400, "/", "localhost", true, true)          // expires in 1 day
		c.SetCookie("refresh_token", newRefreshToken, 604800, "/", "localhost", true, true) // expires in 1 week
		c.JSON(http.StatusOK, gin.H{"message": "Tokens refreshed successfully"})
	}
}
