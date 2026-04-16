from django.shortcuts import render, redirect
from django.contrib.auth import (
    authenticate,
    logout as auth_logout,
    SESSION_KEY,
    BACKEND_SESSION_KEY,
    HASH_SESSION_KEY,
)
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from . import services


# ── Pages ──────────────────────────────────────────────────────────────────

def movie_list_page(request):
    return render(request, "movies/movie_list.html")


def login_view(request):
    if request.user.is_authenticated:
        return redirect("/")

    error = None
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user:
            request.session.cycle_key()
            request.session[SESSION_KEY] = str(user.id)
            request.session[BACKEND_SESSION_KEY] = user.backend
            request.session[HASH_SESSION_KEY] = ""
            request.user = user
            return redirect(request.GET.get("next", "/"))
        error = "Invalid username or password."

    return render(request, "movies/login.html", {"error": error})


def logout_view(request):
    auth_logout(request)
    return redirect("/")


def signup_view(request):
    if request.user.is_authenticated:
        return redirect("/")

    error = None
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        password2 = request.POST.get("password2", "")

        if not username or not password:
            error = "Username and password are required."
        elif password != password2:
            error = "Passwords do not match."
        else:
            try:
                user_doc = services.create_user_with_password(username, password)
                request.session.cycle_key()
                request.session[SESSION_KEY] = str(user_doc["id"])
                request.session[BACKEND_SESSION_KEY] = "movies.backends.MongoAuthBackend"
                request.session[HASH_SESSION_KEY] = ""
                return redirect("/")
            except ValueError as e:
                error = str(e)

    return render(request, "movies/signup.html", {"error": error})


@login_required(login_url="/login/")
def account_view(request):
    success = False
    genres = list(request.user.favorite_genres)

    if request.method == "POST":
        genres_raw = request.POST.get("favorite_genres", "")
        genres = [g.strip() for g in genres_raw.split(",") if g.strip()]
        services.update_user_genres(request.user.id, genres)
        success = True

    return render(request, "movies/account.html", {
        "username": request.user.username,
        "favorite_genres": ", ".join(genres),
        "success": success,
    })


# ── API ────────────────────────────────────────────────────────────────────

class MovieListView(APIView):
    def get(self, request):
        genre = request.query_params.get("genre")
        year = request.query_params.get("year")
        search = request.query_params.get("search")
        movies = services.list_movies(genre=genre, year=year, search=search)
        return Response(movies)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Login required."}, status=401)
        required = ["title", "genre", "year", "director"]
        missing = [f for f in required if not request.data.get(f)]
        if missing:
            return Response(
                {"error": f"Missing fields: {', '.join(missing)}"},
                status=400)
        movie = services.create_movie(
            title=request.data["title"],
            genre=request.data["genre"],
            year=request.data["year"],
            director=request.data["director"],
        )
        return Response(movie.to_dict(), status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name="dispatch")
class MovieRatingsView(APIView):
    def get(self, request, movie_id):
        try:
            ratings = services.get_ratings_for_movie(movie_id)
            return Response({"ratings": ratings})
        except Exception as e:
            return Response({"error": str(e)}, status=404)

    def post(self, request, movie_id):
        if not request.user.is_authenticated:
            return Response({"error": "Login required to submit a rating."}, status=401)

        rating = request.data.get("rating")
        if rating is None:
            return Response({"error": "rating is required"}, status=400)

        try:
            rating = float(rating)
        except (TypeError, ValueError):
            return Response({"error": "rating must be a number"}, status=400)

        if not (1 <= rating <= 10):
            return Response({"error": "rating must be between 1 and 10"}, status=400)

        try:
            services.submit_rating(movie_id, request.user.id, rating)
            return Response({"success": True})
        except Exception as e:
            return Response({"error": str(e)}, status=404)


@method_decorator(csrf_exempt, name="dispatch")
class UserListView(APIView):
    def get(self, request):
        users = services.list_users()
        return Response([u.to_dict() for u in users])

    def post(self, request):
        username = request.data.get("username", "").strip()
        if not username:
            return Response({"error": "username is required"}, status=400)
        favorite_genres = request.data.get("favorite_genres", [])
        try:
            user = services.create_user(username, favorite_genres)
            return Response(user.to_dict(), status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
