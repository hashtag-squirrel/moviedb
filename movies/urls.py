from django.urls import path
from . import views

urlpatterns = [
    path("", views.movie_list_page, name="movie-list-page"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("signup/", views.signup_view, name="signup"),
    path("account/", views.account_view, name="account"),
    path("api/movies/", views.MovieListView.as_view(), name="movie-list-api"),
    path("api/movies/<str:movie_id>/ratings/", views.MovieRatingsView.as_view(), name="movie-ratings-api"),
    path("api/users/", views.UserListView.as_view(), name="user-list-api"),
]
