// ── State ──────────────────────────────────────────────────────────────────
let allMovies      = [];
let debounceTimer  = null;
let currentMovieId = null;
let selectedScore  = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const grid       = document.getElementById("grid");
const genreSel   = document.getElementById("genre");
const yearSel    = document.getElementById("year");
const searchEl   = document.getElementById("search");
const countEl    = document.getElementById("count");
const clearBtn   = document.getElementById("clear-btn");
const backdrop   = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalMeta  = document.getElementById("modal-meta");
const modalAvg   = document.getElementById("modal-avg");
const modalBody  = document.getElementById("modal-body");

// ── Modal open/close ───────────────────────────────────────────────────────
document.getElementById("modal-close").addEventListener("click", closeModal);
backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

function closeModal() {
  backdrop.classList.remove("open");
}

// ── Helpers ────────────────────────────────────────────────────────────────
function avgRating(ratings) {
  if (!ratings || !Array.isArray(ratings) || ratings.length === 0) return null;
  const valid = ratings.map(r => Number(r.rating)).filter(n => !isNaN(n));
  if (valid.length === 0) return null;
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
}

function starsHtml(score) {
  const full = Math.round(Number(score));
  return "★".repeat(full) + "☆".repeat(10 - full);
}

function ratingHtml(ratings) {
  const avg = avgRating(ratings);
  if (avg === null) return `<span class="rating no-rating">Not rated yet</span>`;
  return `<span class="rating">
    <span class="star">★</span>${avg}<span style="font-size:11px;margin-left:1px">/10</span>
  </span>`;
}

function getCsrf() {
  return document.cookie.split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("csrftoken="))
    ?.split("=")[1] || "";
}

// ── Modal ──────────────────────────────────────────────────────────────────
async function openModal(movie) {
  currentMovieId = movie.id;
  selectedScore  = null;

  modalTitle.textContent = movie.title;
  modalMeta.innerHTML = `
    <span>${movie.director}</span>
    <span class="dot">${movie.year}</span>
    <span class="dot">${movie.genre}</span>`;

  const avg = avgRating(movie.ratings);
  modalAvg.innerHTML = avg !== null
    ? `<span class="avg-score">${avg}</span><span class="avg-label">avg / 10</span>`
    : "";

  modalBody.innerHTML = `<div class="modal-loading"><div class="spinner"></div></div>`;
  backdrop.classList.add("open");

  try {
    const res     = await fetch(`/api/movies/${movie.id}/ratings/`);
    const data    = await res.json();
    const ratings = data.ratings || [];

    const ratingsHtml = ratings.length
      ? `<div class="ratings-label">${ratings.length} rating${ratings.length !== 1 ? "s" : ""}</div>
         ${ratings.map(r => `
           <div class="rating-row">
             <span class="rating-user">${r.user_name}</span>
             <span class="rating-stars">
               <span class="stars">${starsHtml(r.rating)}</span>
               <span class="num">${r.rating}/10</span>
             </span>
           </div>`).join("")}`
      : `<div class="no-ratings-msg">No ratings yet for this film.</div>`;

    modalBody.innerHTML = ratingsHtml + `
      <div class="rating-form" id="rating-form">
        <div class="rating-form-label">Leave a rating</div>
        <div class="rating-form-row">
          <select id="form-user">
            <option value="">Who are you?</option>
            <option value="1">Alita</option>
            <option value="2">Bob</option>
          </select>
          <div class="star-picker" id="star-picker">
            ${[1,2,3,4,5,6,7,8,9,10].map(n =>
              `<button type="button" data-score="${n}" title="${n}/10">★</button>`
            ).join("")}
          </div>
          <span class="score-display" id="score-display">—</span>
        </div>
        <div class="rating-form-row">
          <button class="submit-btn" id="submit-rating" disabled>Submit rating</button>
          <span class="form-feedback" id="form-feedback"></span>
        </div>
      </div>`;

    setupStarPicker();
  } catch (err) {
    modalBody.innerHTML = `<div class="no-ratings-msg">Could not load ratings.</div>`;
  }
}

function setupStarPicker() {
  const stars     = document.querySelectorAll("#star-picker button");
  const scoreDisp = document.getElementById("score-display");
  const submitBtn = document.getElementById("submit-rating");
  const feedback  = document.getElementById("form-feedback");
  const userSel   = document.getElementById("form-user");

  function updateStars(n) {
    stars.forEach(s => s.classList.toggle("active", +s.dataset.score <= n));
    scoreDisp.textContent = `${n}/10`;
    selectedScore = n;
    submitBtn.disabled = !userSel.value;
  }

  stars.forEach(btn => {
    btn.addEventListener("mouseover", () => updateStars(+btn.dataset.score));
    btn.addEventListener("click",     () => updateStars(+btn.dataset.score));
  });

  document.getElementById("star-picker").addEventListener("mouseleave", () => {
    if (selectedScore) {
      updateStars(selectedScore);
    } else {
      stars.forEach(s => s.classList.remove("active"));
      scoreDisp.textContent = "—";
    }
  });

  userSel.addEventListener("change", () => {
    submitBtn.disabled = !userSel.value || !selectedScore;
  });

  submitBtn.addEventListener("click", async () => {
    const userId = userSel.value;
    if (!userId || !selectedScore) return;

    submitBtn.disabled   = true;
    feedback.className   = "form-feedback";
    feedback.textContent = "";

    try {
      const res = await fetch(`/api/movies/${currentMovieId}/ratings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ userId: parseInt(userId), rating: selectedScore }),
      });

      if (res.ok) {
        feedback.textContent = "Rating submitted!";
        feedback.className   = "form-feedback success";

        const movie = allMovies.find(m => m.id === currentMovieId);
        if (movie) {
          movie.ratings = movie.ratings || [];
          movie.ratings.push({ userId: parseInt(userId), rating: selectedScore });
          const avg = avgRating(movie.ratings);
          modalAvg.innerHTML = `<span class="avg-score">${avg}</span><span class="avg-label">avg / 10</span>`;
        }
        await fetchMovies();
      } else {
        const err = await res.json();
        feedback.textContent = err.error || "Something went wrong.";
        feedback.className   = "form-feedback error";
        submitBtn.disabled   = false;
      }
    } catch (e) {
      feedback.textContent = "Could not submit. Try again.";
      feedback.className   = "form-feedback error";
      submitBtn.disabled   = false;
    }
  });
}

// ── API calls ──────────────────────────────────────────────────────────────
async function fetchMovies() {
  const params = new URLSearchParams();
  const search = searchEl.value.trim();
  const genre  = genreSel.value;
  const year   = yearSel.value;
  if (search) params.set("search", search);
  if (genre)  params.set("genre", genre);
  if (year)   params.set("year", year);

  try {
    const res  = await fetch(`/api/movies/?${params}`);
    const data = await res.json();
    renderCards(data);
  } catch (err) {
    grid.innerHTML = `<div class="state-msg"><strong>Something went wrong</strong>Could not reach the server.</div>`;
  }
}

async function fetchFiltersOptions() {
  try {
    const res = await fetch("/api/movies/");
    allMovies = await res.json();

    const genres = [...new Set(allMovies.map(m => m.genre))].sort();
    const years  = [...new Set(allMovies.map(m => m.year))].sort((a, b) => b - a);

    genres.forEach(g => {
      const o = document.createElement("option");
      o.value = g; o.textContent = g;
      genreSel.appendChild(o);
    });
    years.forEach(y => {
      const o = document.createElement("option");
      o.value = y; o.textContent = y;
      yearSel.appendChild(o);
    });

    renderCards(allMovies);
  } catch (err) {
    grid.innerHTML = `<div class="state-msg"><strong>Could not load movies</strong>Check your connection and try again.</div>`;
  }
}

// ── Rendering ──────────────────────────────────────────────────────────────
function renderCards(movies) {
  countEl.textContent = movies.length === 1 ? "1 film" : `${movies.length} films`;

  if (!movies.length) {
    grid.innerHTML = `<div class="state-msg"><strong>No results</strong>Try adjusting your filters.</div>`;
    return;
  }

  grid.innerHTML = movies.map((m, i) => `
    <div class="card" style="animation-delay:${Math.min(i * 30, 300)}ms" data-idx="${i}">
      <div class="card-header">
        <div class="card-title">${m.title}</div>
        <div class="year">${m.year}</div>
      </div>
      <div class="card-divider"></div>
      <div class="card-director"><span>dir.</span>${m.director}</div>
      <div class="card-footer">
        <span class="genre-badge">${m.genre}</span>
        ${ratingHtml(m.ratings)}
      </div>
    </div>`).join("");

  document.querySelectorAll(".card").forEach(el => {
    el.addEventListener("click", () => openModal(movies[+el.dataset.idx]));
  });
}

// ── Filter listeners ───────────────────────────────────────────────────────
searchEl.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchMovies, 250);
});
genreSel.addEventListener("change", fetchMovies);
yearSel.addEventListener("change", fetchMovies);
clearBtn.addEventListener("click", () => {
  searchEl.value = "";
  genreSel.value = "";
  yearSel.value  = "";
  renderCards(allMovies);
  countEl.textContent = `${allMovies.length} films`;
});

// ── Init ───────────────────────────────────────────────────────────────────
fetchFiltersOptions();