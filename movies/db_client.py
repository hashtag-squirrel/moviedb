from pymongo import MongoClient
from django.conf import settings
from urllib.parse import quote_plus

_client = None


def get_db():
    global _client
    if _client is None:
        username = quote_plus(settings.MONGODB_USERNAME)
        password = quote_plus(settings.MONGODB_PASSWORD)
        uri = f"mongodb+srv://{username}:{password}@{settings.MONGODB_HOST}/"
        _client = MongoClient(uri)
    return _client[settings.MONGODB_DATABASE]


def get_movies_collection():
    return get_db()["movies"]


def get_users_collection():
    return get_db()["users"]


def get_ratings_collection():
    return get_db()["ratings"]
