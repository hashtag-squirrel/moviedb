from dataclasses import dataclass, field
from typing import List, Optional
import uuid


@dataclass
class Movie:
    title: str
    genre: str
    year: int
    director: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    avg_rating: Optional[float] = None
    rating_count: int = 0

    def to_dict(self):
        return {
            "id":           self.id,
            "title":        self.title,
            "genre":        self.genre,
            "year":         self.year,
            "director":     self.director,
            "avg_rating":   self.avg_rating,
            "rating_count": self.rating_count,
        }

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            id=data["id"],
            title=data["title"],
            genre=data["genre"],
            year=int(data["year"]),
            director=data["director"],
            avg_rating=data.get("avg_rating"),
            rating_count=data.get("rating_count", 0),
        )


@dataclass
class User:
    id: str
    username: str
    favorite_genres: List[str] = field(default_factory=list)

    def to_dict(self):
        return {
            "id":              self.id,
            "username":        self.username,
            "favorite_genres": self.favorite_genres,
        }

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            id=data["id"],
            username=data["username"],
            favorite_genres=data.get("favorite_genres", []),
        )


@dataclass
class Rating:
    id: str
    rating: float
    movie: dict   # {"id", "title", "genre"}
    user: dict    # {"id", "username"}

    def to_dict(self):
        return {
            "id":     self.id,
            "rating": self.rating,
            "movie":  self.movie,
            "user":   self.user,
        }

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            id=data["id"],
            rating=float(data["rating"]),
            movie=data["movie"],
            user=data["user"],
        )
