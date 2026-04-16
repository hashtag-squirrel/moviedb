# Movie DB

A personal movie database with ratings and reviews. Built with Django and MongoDB, deployed on Vercel.

Visit the site: [Movie DB](https://vercel.com/hashtag-squirrels-projects/moviedb/9HanGfbTPJFJQyWXjxp7ttRPyNpK)

## Features

- Browse, search, and filter movies by title, director, genre, and year
- Rate movies on a 1–10 scale
- User accounts with login/signup and favourite genre preferences
- Add new movies (authenticated users only)

## Tech stack

- **Backend:** Django 5, Django REST Framework
- **Database:** MongoDB (via pymongo)
- **Auth:** Custom MongoDB-backed authentication with cookie sessions
- **Frontend:** Vanilla JS, no framework
- **Deployment:** Vercel (serverless) + WhiteNoise for static files

## Local development

**Prerequisites:** Python 3.12, a running MongoDB instance (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

1. Clone the repo and install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the project root:
   ```env
   SECRET_KEY=your-django-secret-key
   DEBUG=True
   MONGODB_USERNAME=your-username
   MONGODB_PASSWORD=your-password
   MONGODB_HOST=your-cluster.mongodb.net
   MONGODB_DATABASE=moviedb
   ```

3. Run migrations (creates Django's session/auth tables):
   ```bash
   python manage.py migrate
   ```

4. Start the development server:
   ```bash
   python manage.py runserver
   ```

5. Visit [http://localhost:8000](http://localhost:8000)

## Deployment (Vercel)

1. Push the repo to GitHub and import it into [Vercel](https://vercel.com).

2. Add the following environment variables in **Vercel → Settings → Environment Variables**:

   | Variable           | Value                        |
   |--------------------|------------------------------|
   | `SECRET_KEY`       | A long random string         |
   | `DEBUG`            | `False`                      |
   | `MONGODB_USERNAME` | Your MongoDB username        |
   | `MONGODB_PASSWORD` | Your MongoDB password        |
   | `MONGODB_HOST`     | Your Atlas cluster hostname  |
   | `MONGODB_DATABASE` | `moviedb`                    |

3. In **MongoDB Atlas → Network Access**, allow connections from anywhere (`0.0.0.0/0`) — Vercel functions use dynamic IPs.

4. Deploy. The build command in `vercel.json` runs migrations and `collectstatic` automatically.

## Project structure

```
moviedb/          # Django project settings, URLs, WSGI
movies/           # Main app — models, views, services, templates, static files
  static/movies/  # CSS and JS
  templates/      # HTML templates
api/              # Vercel serverless entry point
```
