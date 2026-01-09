/*
  SnapShare frontend logic (Plain JavaScript)
  Creator: upload + metadata
  Consumer: feed + search + open post + comment + rate
*/

// Tabs / Views
const creatorTab = document.getElementById("creatorTab");
const feedTab = document.getElementById("feedTab");
const creatorView = document.getElementById("creatorView");
const feedView = document.getElementById("feedView");

// Creator inputs
const imageInput = document.getElementById("imageInput");
const titleInput = document.getElementById("titleInput");
const captionInput = document.getElementById("captionInput");
const locationInput = document.getElementById("locationInput");
const peopleInput = document.getElementById("peopleInput");
const publishBtn = document.getElementById("publishBtn");
const creatorStatus = document.getElementById("creatorStatus");

// Feed
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const feedContainer = document.getElementById("feedContainer");

// Modal (post detail)
const postModal = document.getElementById("postModal");
const closeModalBtn = document.getElementById("closeModal");
const modalBody = document.getElementById("modalBody");

let cachedPosts = [];

// ---------- View switching ----------
creatorTab.onclick = () => {
  creatorTab.classList.add("active");
  feedTab.classList.remove("active");
  creatorView.classList.remove("hidden");
  feedView.classList.add("hidden");
};

feedTab.onclick = () => {
  feedTab.classList.add("active");
  creatorTab.classList.remove("active");
  feedView.classList.remove("hidden");
  creatorView.classList.add("hidden");
  loadFeed("");
};

// ---------- Helpers ----------
function setStatus(text) {
  creatorStatus.innerText = text || "";
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toPeopleArray(value) {
  return String(value || "")
    .split(",")
    .map(p => p.trim())
    .filter(Boolean);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

function formatAvg(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

// ---------- Creator upload ----------
publishBtn.onclick = async () => {
  try {
    setStatus("");
    publishBtn.disabled = true;

    if (!imageInput.files || !imageInput.files[0]) {
      throw new Error("Please select an image.");
    }

    const file = imageInput.files[0];

    // Coursework-safe size (matches backend guard)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Please use an image <= 2 MB for this coursework demo.");
    }

    setStatus("Uploading image...");
    const base64 = await fileToBase64(file);

    const uploadData = await api("/api/upload", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        base64
      })
    });

    setStatus("Saving post...");
    const postData = await api("/api/createPost", {
      method: "POST",
      body: JSON.stringify({
        title: titleInput.value,
        caption: captionInput.value,
        locationText: locationInput.value,
        people: toPeopleArray(peopleInput.value),
        imageUrl: uploadData.imageUrl,
        creatorId: "creator-demo"
      })
    });

    setStatus(`Post published (ID: ${postData.postId})`);

    // Reset inputs
    imageInput.value = "";
    titleInput.value = "";
    captionInput.value = "";
    locationInput.value = "";
    peopleInput.value = "";

  } catch (err) {
    setStatus("Error: " + err.message);
  } finally {
    publishBtn.disabled = false;
  }
};

// ---------- Feed ----------
searchBtn.onclick = () => loadFeed(searchInput.value);

async function loadFeed(searchText) {
  try {
    feedContainer.innerHTML = "<p>Loading...</p>";
    const data = await api(`/api/getPosts?search=${encodeURIComponent(searchText || "")}`, { method: "GET" });
    cachedPosts = Array.isArray(data.posts) ? data.posts : [];
    renderFeed();
  } catch (err) {
    feedContainer.innerHTML = `<p>Error loading feed: ${escapeHtml(err.message)}</p>`;
  }
}

function renderFeed() {
  if (!cachedPosts.length) {
    feedContainer.innerHTML = "<p>No posts found.</p>";
    return;
  }

  feedContainer.innerHTML = "";
  cachedPosts.forEach(post => {
    const div = document.createElement("div");
    div.className = "feed-item";
    div.innerHTML = `
      <img src="${post.imageUrl}" alt="Post image">
      <div class="info">
        <h3>${escapeHtml(post.title || "Untitled")}</h3>
        <p>${escapeHtml(post.caption || "")}</p>
        <p><strong>Location:</strong> ${escapeHtml(post.locationText || "")}</p>
        <p><strong>Rating:</strong> ${formatAvg(post.ratingAvg)} (${post.ratingCount ?? 0})</p>
        <p class="small">Click to open</p>
      </div>
    `;
    div.onclick = () => openPost(post.postId);
    feedContainer.appendChild(div);
  });
}

// ---------- Modal (post detail) ----------
closeModalBtn.onclick = closeModal;
postModal.onclick = (e) => { if (e.target === postModal) closeModal(); };

function closeModal() {
  postModal.classList.add("hidden");
  modalBody.innerHTML = "";
}

async function openPost(postId) {
  try {
    postModal.classList.remove("hidden");
    modalBody.innerHTML = "<p>Loading post...</p>";

    const post = cachedPosts.find(p => p.postId === postId);
    if (!post) throw new Error("Post not found in feed.");

    const commentsData = await api(`/api/getComments?postId=${encodeURIComponent(postId)}`, { method: "GET" });
    const comments = Array.isArray(commentsData.comments) ? commentsData.comments : [];

    modalBody.innerHTML = renderDetail(post, comments);

    document.getElementById("commentBtn").onclick = () => submitComment(postId);
    document.getElementById("rateBtn").onclick = () => submitRating(postId);

  } catch (err) {
    modalBody.innerHTML = `<p>Error: ${escapeHtml(err.message)}</p>`;
  }
}

function renderDetail(post, comments) {
  const peopleText = (post.people || []).join(", ");
  const commentsHtml = comments.length
    ? comments.map(c => `
        <li>
          ${escapeHtml(c.text)}
          <span class="small">(${new Date(c.createdAt).toLocaleString()})</span>
        </li>
      `).join("")
    : `<li class="small">No comments yet.</li>`;

  return `
    <div class="detail-grid">
      <div>
        <img src="${post.imageUrl}" alt="Post image">
      </div>
      <div>
        <h2 style="margin-top:0;">${escapeHtml(post.title || "Untitled")}</h2>
        <p class="small">${escapeHtml(post.caption || "")}</p>
        <p class="small"><strong>Location:</strong> ${escapeHtml(post.locationText || "")}</p>
        <p class="small"><strong>People:</strong> ${escapeHtml(peopleText)}</p>
        <p class="small"><strong>Rating:</strong> ${formatAvg(post.ratingAvg)} (${post.ratingCount ?? 0})</p>

        <div class="card-lite">
          <label><strong>Add Comment</strong></label>
          <input id="commentText" type="text" placeholder="Write a comment..." />
          <button id="commentBtn">Submit Comment</button>
          <p id="commentStatus" class="small"></p>
        </div>

        <div class="card-lite">
          <label><strong>Rate (1–5)</strong></label>
          <input id="stars" type="number" min="1" max="5" value="5" />
          <button id="rateBtn">Submit Rating</button>
          <p id="rateStatus" class="small"></p>
        </div>

        <div class="card-lite">
          <label><strong>Comments</strong></label>
          <ul>${commentsHtml}</ul>
        </div>
      </div>
    </div>
  `;
}

async function submitComment(postId) {
  const text = String(document.getElementById("commentText").value || "").trim();
  const statusEl = document.getElementById("commentStatus");

  if (!text) { statusEl.innerText = "Comment cannot be empty."; return; }

  try {
    statusEl.innerText = "Saving...";
    await api("/api/addComment", {
      method: "POST",
      body: JSON.stringify({ postId, userId: "consumer-demo", text })
    });
    statusEl.innerText = "Saved.";
    await openPost(postId); // refresh
  } catch (err) {
    statusEl.innerText = "Error: " + err.message;
  }
}

async function submitRating(postId) {
  const stars = parseInt(document.getElementById("stars").value, 10);
  const statusEl = document.getElementById("rateStatus");

  if (!(stars >= 1 && stars <= 5)) { statusEl.innerText = "Rating must be 1–5."; return; }

  try {
    statusEl.innerText = "Saving...";
    await api("/api/addRating", {
      method: "POST",
      body: JSON.stringify({ postId, userId: "consumer-demo", stars })
    });
    statusEl.innerText = "Saved.";
    await loadFeed(searchInput.value); // refresh list values
    await openPost(postId); // refresh modal values
  } catch (err) {
    statusEl.innerText = "Error: " + err.message;
  }
}

// Default view
creatorTab.click();
