// ── State ──────────────────────────────────────────────────────────────────
let allMovies      = [];
let allUsers       = [];
let debounceTimer  = null;
let currentMovieId = null;
let selectedScore  = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const grid       = document.getElementById("grid");
const genreSel   = document.getElementById("genre");
const yearSel    = document.getElementById("year");
const sortSel    = document.getElementById("sort");
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
function avgRating(movie) {
  if (!movie.avg_rating || movie.rating_count === 0) return null;
  return Number(movie.avg_rating).toFixed(1);
}

function starsHtml(score) {
  const full = Math.round(Number(score));
  return "★".repeat(full) + "☆".repeat(10 - full);
}

function ratingHtml(movie) {
  const avg = avgRating(movie);
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

  const avg = avgRating(movie);
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

    const userOptions = allUsers.map(u =>
      `<option value="${u.id}">${u.username}</option>`
    ).join("");

    modalBody.innerHTML = ratingsHtml + `
      <div class="rating-form" id="rating-form">
        <div class="rating-form-label">Leave a rating</div>
        <div class="rating-form-row">
          <select id="form-user">
            <option value="">Who are you?</option>
            ${userOptions}
            <option value="__new__">+ New user</option>
          </select>
          <div class="star-picker" id="star-picker">
            ${[1,2,3,4,5,6,7,8,9,10].map(n =>
              `<button type="button" data-score="${n}" title="${n}/10">★</button>`
            ).join("")}
          </div>
          <span class="score-display" id="score-display">—</span>
        </div>

        <div id="new-user-fields" style="display:none; flex-direction:column; gap:10px;">
          <input type="text" id="new-username" placeholder="Username" style="padding:9px 12px;" />
          <input type="text" id="new-genres" placeholder="Favourite genres (comma-separated, e.g. Drama, Sci-Fi)" style="padding:9px 12px;" />
        </div>

        <div class="rating-form-row">
          <button class="submit-btn" id="submit-rating" disabled>Submit rating</button>
          <span class="form-feedback" id="form-feedback"></span>
        </div>
      </div>`;

    setupRatingForm();
  } catch (err) {
    modalBody.innerHTML = `<div class="no-ratings-msg">Could not load ratings.</div>`;
  }
}

function setupRatingForm() {
  const stars         = document.querySelectorAll("#star-picker button");
  const scoreDisp     = document.getElementById("score-display");
  const submitBtn     = document.getElementById("submit-rating");
  const feedback      = document.getElementById("form-feedback");
  const userSel       = document.getElementById("form-user");
  const newUserFields = document.getElementById("new-user-fields");
  const newUsername   = document.getElementById("new-username");
  const newGenres     = document.getElementById("new-genres");

  function isFormValid() {
    if (!selectedScore) return false;
    if (userSel.value === "__new__") return newUsername.value.trim().length > 0;
    return userSel.value !== "";
  }

  function updateStars(n) {
    stars.forEach(s => s.classList.toggle("active", +s.dataset.score <= n));
    scoreDisp.textContent = `${n}/10`;
    selectedScore = n;
    submitBtn.disabled = !isFormValid();
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
    const isNew = userSel.value === "__new__";
    newUserFields.style.display = isNew ? "flex" : "none";
    submitBtn.disabled = !isFormValid();
  });

  newUsername.addEventListener("input", () => {
    submitBtn.disabled = !isFormValid();
  });

  submitBtn.addEventListener("click", async () => {
    if (!isFormValid()) return;

    submitBtn.disabled   = true;
    feedback.className   = "form-feedback";
    feedback.textContent = "";

    try {
      let userId   = userSel.value;
      let username = allUsers.find(u => u.id === userId)?.username;

      // Create new user first if needed
      if (userId === "__new__") {
        const genres = newGenres.value.split(",").map(g => g.trim()).filter(Boolean);
        const createRes = await fetch("/api/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify({ username: newUsername.value.trim(), favorite_genres: genres }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          feedback.textContent = err.error || "Could not create user.";
          feedback.className   = "form-feedback error";
          submitBtn.disabled   = false;
          return;
        }

        const newUser = await createRes.json();
        userId   = newUser.id;
        username = newUser.username;

        // Add to local users list and dropdown
        allUsers.push(newUser);
        const opt = document.createElement("option");
        opt.value = newUser.id;
        opt.textContent = newUser.username;
        userSel.insertBefore(opt, userSel.querySelector('option[value="__new__"]'));
        userSel.value = newUser.id;
        newUserFields.style.display = "none";
      }

      // Submit the rating
      const res = await fetch(`/api/movies/${currentMovieId}/ratings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ userId, rating: selectedScore }),
      });

      if (res.ok) {
        feedback.textContent = "Rating submitted!";
        feedback.className   = "form-feedback success";

        // fetchMovies refreshes allMovies with updated avg_rating from the server
        await fetchMovies();
        const updated = allMovies.find(m => m.id === currentMovieId);
        if (updated) {
          const avg = avgRating(updated);
          modalAvg.innerHTML = avg
            ? `<span class="avg-score">${avg}</span><span class="avg-label">avg / 10</span>`
            : "";
        }
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
    const [moviesRes, usersRes] = await Promise.all([
      fetch("/api/movies/"),
      fetch("/api/users/"),
    ]);

    allMovies = await moviesRes.json();
    allUsers  = await usersRes.json();

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

// ── Sorting ────────────────────────────────────────────────────────────────
function sortMovies(movies) {
  const [field, dir] = (sortSel.value || "").split("_");
  if (!field) return movies;

  return [...movies].sort((a, b) => {
    let valA, valB;

    if (field === "rating") {
      valA = a.avg_rating ?? -1;
      valB = b.avg_rating ?? -1;
    } else if (field === "id") {
      valA = parseInt(a.id) || 0;
      valB = parseInt(b.id) || 0;
    } else {
      valA = (a[field] || "").toString().toLowerCase();
      valB = (b[field] || "").toString().toLowerCase();
    }

    if (valA < valB) return dir === "asc" ? -1 : 1;
    if (valA > valB) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// ── Rendering ──────────────────────────────────────────────────────────────
function renderCards(movies) {
  const sorted = sortMovies(movies);
  countEl.textContent = sorted.length === 1 ? "1 film" : `${sorted.length} films`;

  if (!sorted.length) {
    grid.innerHTML = `<div class="state-msg"><strong>No results</strong>Try adjusting your filters.</div>`;
    return;
  }

  grid.innerHTML = sorted.map((m, i) => `
    <div class="card" style="animation-delay:${Math.min(i * 30, 300)}ms" data-idx="${i}">
      <div class="card-header">
        <div class="card-title">${m.title}</div>
        <div class="year">${m.year}</div>
      </div>
      <div class="card-divider"></div>
      <div class="card-director"><span>dir.</span>${m.director}</div>
      <div class="card-footer">
        <span class="genre-badge">${m.genre}</span>
        ${ratingHtml(m)}
      </div>
    </div>`).join("");

  document.querySelectorAll(".card").forEach(el => {
    el.addEventListener("click", () => openModal(sorted[+el.dataset.idx]));
  });
}

// ── Filter listeners ───────────────────────────────────────────────────────
searchEl.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchMovies, 250);
});
genreSel.addEventListener("change", fetchMovies);
yearSel.addEventListener("change", fetchMovies);
sortSel.addEventListener("change", () => renderCards(allMovies));
clearBtn.addEventListener("click", () => {
  searchEl.value = "";
  genreSel.value = "";
  yearSel.value  = "";
  sortSel.value  = "";
  renderCards(allMovies);
  countEl.textContent = `${allMovies.length} films`;
});

// ── Init ───────────────────────────────────────────────────────────────────
fetchFiltersOptions();
