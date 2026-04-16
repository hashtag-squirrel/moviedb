from django.contrib.auth.hashers import check_password
from .db_client import get_users_collection


class MongoUser:
    """Minimal user object compatible with Django's auth middleware and DRF."""
    is_authenticated = True
    is_anonymous = False
    is_active = True
    is_staff = False
    is_superuser = False

    def __init__(self, data: dict):
        self.id = data["id"]
        self.pk = data["id"]
        self.username = data["username"]
        self.favorite_genres = data.get("favorite_genres", [])

    def __str__(self):
        return self.username

    def get_username(self):
        return self.username


class MongoAuthBackend:
    def authenticate(self, request, username=None, password=None):
        doc = get_users_collection().find_one({"username": username}, {"_id": 0})
        if not doc or "password_hash" not in doc:
            return None
        if check_password(password, doc["password_hash"]):
            user = MongoUser(doc)
            user.backend = f"{self.__class__.__module__}.{self.__class__.__name__}"
            return user
        return None

    def get_user(self, user_id):
        doc = get_users_collection().find_one({"id": str(user_id)}, {"_id": 0})
        if doc and "password_hash" in doc:
            return MongoUser(doc)
        return None
