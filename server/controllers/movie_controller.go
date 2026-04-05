package controllers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ChannMyaeAung/streamly/server/database"
	"github.com/ChannMyaeAung/streamly/server/models"
	"github.com/ChannMyaeAung/streamly/server/utils"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
	"github.com/tmc/langchaingo/llms/openai"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/gin-gonic/gin"
)

var validate = validator.New()

func GetMovies(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		var movies []models.Movie

		findOpts := options.Find().SetSort(bson.D{{Key: "_id", Value: -1}})

		cursor, err := movieCollection.Find(ctx, bson.D{}, findOpts)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while fetching movies"})

		}
		defer cursor.Close(ctx)

		if err = cursor.All(ctx, &movies); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while decoding movies"})
			return
		}

		c.JSON(http.StatusOK, movies)
	}
}

func GetMovie(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		movieID := c.Param("imdb_id")
		if movieID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Movie ID is required"})
			return
		}

		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		var movie models.Movie

		err := movieCollection.FindOne(ctx, bson.D{{Key: "imdb_id", Value: movieID}}).Decode(&movie)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}

		c.JSON(http.StatusOK, movie)
	}
}

func AddMovie(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, err := utils.GetRoleFromContext(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Role not found in context"})
			return
		}
		if role == "DEMO_ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Adding movies is disabled in demo mode"})
			return
		}
		if role != "ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can add movies"})
			return
		}

		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var movie models.Movie

		if err := c.ShouldBindJSON(&movie); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON provided"})
			return
		}

		// running the validation defined in models
		if err := validate.Struct(movie); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
			return
		}

		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		result, err := movieCollection.InsertOne(ctx, movie)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while adding movie"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// AdminReviewUpdate persists an admin-authored review and refreshes the movie's ranking via the AI helper.
// Binds the admin review body, invokes GetReviewRanking() to classify the text, and updates MongoDB.
func AdminReviewUpdate(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		role, err := utils.GetRoleFromContext(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Role not found in context"})
			return
		}

		if role != "ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can update reviews"})
			return
		}
		if role == "DEMO_ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Review updates are disabled in demo mode"})
			return
		}

		movieId := c.Param("imdb_id")
		if movieId == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Movie ID is required"})
			return
		}

		var req struct {
			AdminReview string `json:"admin_review"`
		}

		var resp struct {
			RankingName string `json:"ranking_name"`
			AdminReview string `json:"admin_review"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON provided"})
			return
		}

		// Ask the AI classifier to score the review text so we can persist both label and numeric value.
		sentiment, rankVal, err := GetReviewRanking(req.AdminReview, client, c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while getting review ranking"})
			return
		}

		// Prepare a MongoDB update that stores the review copy and its computed ranking fields.
		filter := bson.D{{Key: "imdb_id", Value: movieId}}
		update := bson.M{
			"$set": bson.M{
				"admin_review": req.AdminReview,
				"ranking": bson.M{
					"ranking_value": rankVal,
					"ranking_name":  sentiment,
				},
			},
		}

		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		result, err := movieCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while updating admin review"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}

		resp.RankingName = sentiment
		resp.AdminReview = req.AdminReview

		c.JSON(http.StatusOK, resp)
	}
}

// GetReviewRanking evaluates the provided review text and returns the matching ranking label and value.
func GetReviewRanking(admin_review string, client *mongo.Client, c *gin.Context) (string, int, error) {
	// Load ranking definitions so the AI result can be translated into a numeric score.
	rankings, err := GetRankings(client, c)
	if err != nil {
		return "", 0, err
	}

	sentimentDelimited := ""
	for _, ranking := range rankings {
		// 999 means "Not Ranked"
		// if the ranking value is not 999, append to sentimentDelimited
		// 1 = "Excellent", 2 = "Good", 3 = "Average", 4 = "Poor", 5 = "Terrible"
		if ranking.RankingValue != 999 {
			sentimentDelimited = sentimentDelimited + ranking.RankingName + ","
		}
	}

	// e.g. "Excellent,Good,Average,Poor,Terrible"
	sentimentDelimited = strings.Trim(sentimentDelimited, ",")

	// Reload .env to ensure the OpenAI API key is present during server runtime.
	err = godotenv.Load(".env")
	if err != nil {
		log.Println("Error loading .env file")
	}

	OpenAiApiKey := os.Getenv("OPENAI_API_KEY")
	if OpenAiApiKey == "" {
		return "", 0, errors.New("could not read OpenAI API Key from environment")
	}

	// Spin up an LLM client that will classify the review text.
	llm, err := openai.New(openai.WithToken(OpenAiApiKey))
	if err != nil {
		return "", 0, err
	}

	base_prompt_template := os.Getenv("BASE_PROMPT_TEMPLATE")

	// swaps the {rankings} placeholder with the comma-delimited ranking names
	// 1 = replace only the first {rankings} occurrence
	base_prompt := strings.Replace(base_prompt_template, "{rankings}", sentimentDelimited, 1)

	// Feed the admin review into the prompt so the model returns a single ranking label.
	response, err := llm.Call(c, base_prompt+admin_review)
	if err != nil {
		return "", 0, err
	}

	// Map the returned ranking label back to its numeric value for storage.
	// RankingName = "Good", "Excellent", "Terrible" etc.
	// if RankingName is equal to the response from the model, set rankVal to the corresponding RankingValue
	// RankingValue = 1, 2, 3, 4, 5 etc.
	rankVal := 0
	for _, ranking := range rankings {
		if ranking.RankingName == response {
			rankVal = ranking.RankingValue
			break
		}
	}
	return response, rankVal, nil
}

// GetRankings fetches the ranking lookup list from MongoDB so other flows can reference it.
func GetRankings(client *mongo.Client, c *gin.Context) ([]models.Ranking, error) {
	var rankings []models.Ranking

	ctx, cancel := context.WithTimeout(c, 100*time.Second)
	defer cancel()

	// Use the shared DB helper to open the rankings collection.
	var rankingCollection *mongo.Collection = database.OpenCollection("rankings", client)

	// Grab the entire rankings set; small enough to load in one query.
	cursor, err := rankingCollection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &rankings); err != nil {
		return nil, err
	}
	return rankings, nil
}

// GetRecommendedMovies surfaces top-ranked titles that match the signed-in user's favourite genres.
func GetRecommendedMovies(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Auth middleware stores userId on context; without it, we cannot personalize the feed.
		userId, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
			return
		}

		// Pull the user's favourited genres; returns names like "Comedy", "Drama".
		favourite_genres, err := GetUsersFavouriteGenres(userId, client, c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while fetching user's favourite genres"})
			return
		}

		// Load runtime config so we can respect RECOMMENDED_MOVIE_LIMIT if provided.
		err = godotenv.Load(".env")
		if err != nil {
			log.Println("Error loading .env file")
		}

		var recommendedMovieLimitVal int64

		// Optional limit controls how many movies the query returns; default is zero (no limit).
		recommendedMovieLimitStr := os.Getenv("RECOMMENDED_MOVIE_LIMIT")
		if recommendedMovieLimitStr != "" {
			recommendedMovieLimitVal, _ = strconv.ParseInt(recommendedMovieLimitStr, 10, 64)
		}

		findOptions := options.Find()

		// In the database, ranking = {ranking_value: 1, ranking_name: "Excellent"}
		// Sort ascending so lower ranking_value (better rank) appears first, then apply the limit.
		findOptions.SetSort(bson.D{{Key: "ranking.ranking_value", Value: 1}})
		findOptions.SetLimit(recommendedMovieLimitVal)

		// Filter for any movies whose embedded genre array contains one of the user's favourites.
		// $in match documents where the field's value equals any element in this list.
		// the field is genre.genre_name, and the list is favourite_genres
		// so it returns every movie whose genre array contains at least one of the user's favourite genre names.
		filter := bson.D{
			{Key: "genre.genre_name", Value: bson.D{
				{Key: "$in", Value: favourite_genres},
			}},
		}

		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		cursor, err := movieCollection.Find(ctx, filter, findOptions)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while fetching recommended movies"})
			return
		}
		defer cursor.Close(ctx)

		var recommendedMovies []models.Movie

		// Stream cursor results into the slice; any decode error bubbles up as 500.
		if err := cursor.All(ctx, &recommendedMovies); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while decoding recommended movies"})
			return
		}

		c.JSON(http.StatusOK, recommendedMovies)
	}
}

// GetUsersFavouriteGenres looks up a user's stored favourite genres and returns just their names.
func GetUsersFavouriteGenres(userId string, client *mongo.Client, c *gin.Context) ([]string, error) {
	ctx, cancel := context.WithTimeout(c, 100*time.Second)
	defer cancel()

	// Build a filter to locate the user document by the stable user_id field.
	filter := bson.D{{Key: "user_id", Value: userId}}

	// Projection limits the payload to the favourite_genres array; saves bandwidth and avoids leaking other fields.
	projection := bson.M{
		"favourite_genres": 1,
		"_id":              0,
	}

	// Call out the projection that returns only the favourite_genres field to avoid extra data.
	opts := options.FindOne().SetProjection(projection)

	var userCollection *mongo.Collection = database.OpenCollection("users", client)

	var result bson.M

	// Read the document; return an empty slice if the user doesn't exist.
	err := userCollection.FindOne(ctx, filter, opts).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return []string{}, nil
		}
	}

	// favourite_genres is stored as a BSON array of embedded documents.
	favGenresArray, ok := result["favourite_genres"].(bson.A)
	if !ok {
		return []string{}, errors.New("unable to retrieve favourite genres")
	}

	var genreNames []string

	// Traverse the embedded docs to pull out the literal genre_name strings.
	// genre_name = "Comedy", "Thriller", "Drama" etc.
	for _, item := range favGenresArray {
		if genreMap, ok := item.(bson.D); ok {
			for _, elem := range genreMap {
				if elem.Key == "genre_name" {
					if name, ok := elem.Value.(string); ok {
						genreNames = append(genreNames, name)
					}
				}
			}
		}
	}
	return genreNames, nil
}

func GetGenres(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var genreCollection *mongo.Collection = database.OpenCollection("genres", client)

		cursor, err := genreCollection.Find(ctx, bson.D{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while fetching genres"})
			return
		}

		defer cursor.Close(ctx)

		var genres []models.Genre
		if err = cursor.All(ctx, &genres); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while decoding genres"})
			return
		}
		c.JSON(http.StatusOK, genres)
	}
}

func DeleteMovie(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, err := utils.GetRoleFromContext(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Role not found."})
			return
		}

		if role != "ADMIN" && role != "DEMO_ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can delete movies."})
			return
		}
		if role == "DEMO_ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Deleting movies is disabled in demo mode"})
			return
		}

		movieID := c.Param("imdb_id")
		if movieID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Movie ID is required."})
			return
		}

		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		movieCollection := database.OpenCollection("movies", client)

		result, err := movieCollection.DeleteOne(ctx, bson.D{{Key: "imdb_id", Value: movieID}})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occurred while deleting movie."})
			return
		}
		if result.DeletedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found."})
			return
		}

		c.Status(http.StatusNoContent)
	}
}
