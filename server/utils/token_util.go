package utils

import (
	"context"
	"errors"
	"os"
	"strings"
	"time"

	"github.com/ChannMyaeAung/streamly/server/database"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type SignedDetails struct {
	Email     string
	FirstName string
	LastName  string
	Role      string
	UserId    string
	jwt.RegisteredClaims
}

var SECRET_KEY string = os.Getenv("SECRET_KEY")
var SECRET_REFRESH_KEY string = os.Getenv("SECRET_REFRESH_KEY")

func GenerateAllTokens(email, firstName, lastName, role, userId string) (string, string, error) {
	claims := &SignedDetails{
		Email:     email,
		FirstName: firstName,
		LastName:  lastName,
		Role:      role,
		UserId:    userId,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "streamly",
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)), // 1 day
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(SECRET_KEY))
	if err != nil {
		return "", "", err
	}

	refreshClaims := &SignedDetails{
		Email:     email,
		FirstName: firstName,
		LastName:  lastName,
		Role:      role,
		UserId:    userId,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "streamly",
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * 7 * time.Hour)), // 7 days
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	signedRefreshToken, err := refreshToken.SignedString([]byte(SECRET_REFRESH_KEY))
	if err != nil {
		return "", "", err
	}

	return signedToken, signedRefreshToken, nil
}

func UpdateAllTokens(userId, token, refreshToken string, client *mongo.Client) (err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
	defer cancel()

	updatedAt, _ := time.Parse(time.RFC3339, time.Now().Format(time.RFC3339))

	updateData := bson.M{
		"$set": bson.M{
			"token":         token,
			"refresh_token": refreshToken,
			"update_at":     updatedAt,
		},
	}

	var userCollection *mongo.Collection = database.OpenCollection("users", client)

	_, err = userCollection.UpdateOne(ctx, bson.M{"user_id": userId}, updateData)

	if err != nil {
		return err
	}
	return nil
}

func GetAccessToken(c *gin.Context) (string, error) {
	authHeader := c.Request.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if tokenString != "" {
			return tokenString, nil
		}
		return "", errors.New("bearer token is missing")
	}

	cookieToken, err := c.Cookie("access_token")
	if err == nil && cookieToken != "" {
		return cookieToken, nil
	}

	if authHeader != "" {
		return "", errors.New("unsupported authorization header format")
	}

	return "", errors.New("authorization credentials not provided")
}

func ValidateToken(tokenString string) (*SignedDetails, error) {
	// claims collects the decoded JWT payload along with standard RegisteredClaims.
	claims := &SignedDetails{}

	// Parse the incoming token string and hydrate the claims using the signing key.
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(SECRET_KEY), nil
	})

	if err != nil {
		return nil, err
	}

	// Reject tokens that were not signed with HMAC since they cannot be verified by SECRET_KEY.
	if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
		return nil, err
	}

	// Ensure the token has not yet expired; prevent replay of stale credentials.
	if claims.ExpiresAt.Time.Before(time.Now()) {
		return nil, errors.New("token has expired")
	}
	return claims, nil
}

// Since we store userId and role in the Gin context in the AuthMiddleware, we can retrieve them here.
func GetUserIdFromContext(c *gin.Context) (string, error) {
	userId, exists := c.Get("userId")
	if !exists {
		return "", errors.New("userId not found in context")
	}

	id, ok := userId.(string)
	if !ok {
		return "", errors.New("userId in context is not a string")
	}
	return id, nil
}

// Since we store userId and role in the Gin context in the AuthMiddleware, we can retrieve them here.
func GetRoleFromContext(c *gin.Context) (string, error) {
	role, exists := c.Get("role")
	if !exists {
		return "", errors.New("role not found in context")
	}

	memberRole, ok := role.(string)
	if !ok {
		return "", errors.New("role in context is not a string")
	}
	return memberRole, nil
}

func ValidateRefreshToken(tokenString string) (*SignedDetails, error) {
	// Claims target the refresh token payload structure, including expiry metadata.
	claims := &SignedDetails{}

	// Parse the token using the refresh secret; this verifies the signature and fills the claims object.
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(SECRET_REFRESH_KEY), nil
	})
	if err != nil {
		return nil, err
	}

	// Only accept HMAC-signed tokens; anything else could be forged.
	if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
		return nil, err
	}

	// Ensure the refresh token is still valid; expired tokens cannot mint new access tokens.
	if claims.ExpiresAt.Time.Before(time.Now()) {
		return nil, errors.New("refresh token has expired")
	}
	return claims, nil
}
