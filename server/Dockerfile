# builder stage
FROM golang:1.25.3 AS builder
WORKDIR /src

# cache modules
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# build a static linux binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app ./...

# final minimal image
FROM gcr.io/distroless/static-debian11
COPY --from=builder /app /app
EXPOSE 8080
ENTRYPOINT ["/app"]
