from .db_client import get_movies_collection, get_users_collection, get_ratings_collection  # noqa
from .models import Movie, User
import uuid


# ── Movies ─────────────────────────────────────────────────────────────────

def get_movie(movie_id: str) -> Movie:
    doc = get_movies_collection().find_one({"id": movie_id}, {"_id": 0})
    if not doc:
        raise Exception(f"Movie {movie_id} not found")
    return Movie.from_dict(doc)


def list_movies(genre=None, year=None, search=None) -> list:
    """
    Returns movies as dicts. avg_rating and rating_count are stored
    directly on the movie document so no ratings query is needed.
    """
    query = {}
    if genre:
        query["genre"] = genre
    if year:
        query["year"] = int(year)
    if search:
        query["$or"] = [
            {"title":    {"$regex": search, "$options": "i"}},
            {"director": {"$regex": search, "$options": "i"}},
        ]

    return list(get_movies_collection().find(query, {"_id": 0}))


def create_movie(title, genre, year, director) -> Movie:
    movie = Movie(title=title, genre=genre, year=int(year), director=director)
    get_movies_collection().insert_one(movie.to_dict())
    return movie


# ── Ratings ────────────────────────────────────────────────────────────────

def get_ratings_for_movie(movie_id: str) -> list[dict]:
    """Returns ratings for a movie with user_name and rating fields."""
    docs = get_ratings_collection().find({"movie.id": movie_id}, {"_id": 0})
    return [
        {"user_name": r["user"]["username"], "rating": r["rating"]}
        for r in docs
    ]


def submit_rating(movie_id: str, user_id: str, rating: float) -> None:
    movies = get_movies_collection()
    users = get_users_collection()
    ratings = get_ratings_collection()

    movie_doc = movies.find_one({"id": movie_id}, {"_id": 0})
    if not movie_doc:
        raise Exception(f"Movie {movie_id} not found")

    user_doc = users.find_one({"id": str(user_id)}, {"_id": 0})
    if not user_doc:
        raise Exception(f"User {user_id} not found")

    # Upsert the rating document
    ratings.update_one(
        {"movie.id": movie_id, "user.id": str(user_id)},
        {"$set": {
            "id":     str(uuid.uuid4()),
            "rating": rating,
            "movie":  {
                "id": movie_doc["id"],
                "title": movie_doc["title"],
                "genre": movie_doc["genre"]},
            "user":   {"id": user_doc["id"], "username": user_doc["username"]},
        }},
        upsert=True,
    )

    # Recalculate avg_rating and rating_count from the ratings collection
    # and write them back to the movie document
    pipeline = [
        {"$match": {"movie.id": movie_id}},
        {"$group": {
            "_id":          "$movie.id",
            "avg_rating":   {"$avg": "$rating"},
            "rating_count": {"$sum": 1},
        }},
    ]
    result = list(ratings.aggregate(pipeline))
    if result:
        movies.update_one(
            {"id": movie_id},
            {"$set": {
                "avg_rating":   round(result[0]["avg_rating"], 1),
                "rating_count": result[0]["rating_count"],
            }},
        )


# ── Users ──────────────────────────────────────────────────────────────────

def list_users() -> list[User]:
    return [User.from_dict(u) for u in get_users_collection().find({},
                                                                   {"_id": 0})]


def get_user(user_id: str) -> User:
    doc = get_users_collection().find_one({"id": str(user_id)}, {"_id": 0})
    if not doc:
        raise Exception(f"User {user_id} not found")
    return User.from_dict(doc)


def create_user(username: str, favorite_genres: list) -> User:
    users = get_users_collection()
    if users.find_one({"username": username}, {"_id": 0}):
        raise ValueError(f"Username '{username}' is already taken")

    all_ids = [int(u["id"]) for u in users.find({}, {"_id": 0}) if str(
        u.get("id", "")).isdigit()]
    next_id = str(max(all_ids, default=0) + 1)

    doc = {
        "id":              next_id,
        "username":        username,
        "favorite_genres": favorite_genres,
    }
    users.insert_one(doc)
    return User.from_dict(doc)
