from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from . import services


def movie_list_page(request):
    return render(request, "movies/movie_list.html")


class MovieListView(APIView):
    def get(self, request):
        genre = request.query_params.get("genre")
        year = request.query_params.get("year")
        search = request.query_params.get("search")
        movies = services.list_movies(genre=genre, year=year, search=search)
        return Response(movies)

    def post(self, request):
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
        user_id = request.data.get("userId")
        rating = request.data.get("rating")

        if user_id is None or rating is None:
            return Response(
                {"error": "userId and rating are required"},
                status=400)

        try:
            rating = float(rating)
        except (TypeError, ValueError):
            return Response(
                {"error": "rating must be a number"},
                status=400)

        if not (1 <= rating <= 10):
            return Response(
                {"error": "rating must be between 1 and 10"},
                status=400)

        try:
            services.submit_rating(movie_id, str(user_id), rating)
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
