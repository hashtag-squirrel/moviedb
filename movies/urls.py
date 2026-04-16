from django.urls import path
from . import views

urlpatterns = [
    path("", views.movie_list_page, name="movie-list-page"),
    path("api/movies/", views.MovieListView.as_view(), name="movie-list-api"),
    path("api/movies/<str:movie_id>/ratings/", views.MovieRatingsView.as_view(), name="movie-ratings-api"),
    path("api/users/", views.UserListView.as_view(), name="user-list-api"),
]
