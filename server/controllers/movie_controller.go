package controllers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ChannMyaeAung/streamly/server/database"
	"github.com/ChannMyaeAung/streamly/server/models"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
	"github.com/tmc/langchaingo/llms/openai"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"

	"github.com/gin-gonic/gin"
)

var validate = validator.New()

func GetMovies(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		var movies []models.Movie

		cursor, err := movieCollection.Find(ctx, bson.M{})
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

func GetRecommendedMovies(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

	}
}
