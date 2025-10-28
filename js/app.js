/**
 * ImageAssign Application Script
 * ---------------------------------
 * Core functionality:
 *  - Fetch random nature images from Unsplash (batch-loaded)
 *  - Assign selected images to user-provided email addresses
 *  - Store history in localStorage
 *  - Display grouped thumbnails per email
 *  - Lightbox preview (prev/next navigation)
 *
 *  Performance:
 *   ✔ Batched API calls to avoid Unsplash rate limiting
 *   ✔ Cached images allow near-instant switching
 */

console.log("Script loaded & running.");

(function () {
  "use strict";

  /* --------------------------------------------------------------
   * Configuration
   * ------------------------------------------------------------ */

  const STORAGE_KEY = "emailImages.v1";
  const UNSPLASH_ACCESS_KEY = "EutaxUDh0GyczRPGpYk-KRUjCnzRHnPii8b0Fe4j6Uw";

  /* --------------------------------------------------------------
   * Cached state
   * ------------------------------------------------------------ */

  let cachedImages = []; // Stored batch of loaded Unsplash data
  let isFetchingBatch = false; // Prevents duplicate fetch calls
  let currentImageUrl = null;

  let slideshowImages = [];
  let slideshowIndex = 0;

  /* --------------------------------------------------------------
   * DOM Elements
   * ------------------------------------------------------------ */

  const imgEl = document.getElementById("currentImage");
  const imgSkeleton = document.getElementById("imgSkeleton");
  const imageFrame = document.querySelector(".image-frame");
  const imageMeta = document.getElementById("imageMeta");

  const form = document.getElementById("assignForm");
  const emailInput = document.getElementById("email");
  const emailError = document.getElementById("emailError");
  const statusEl = document.getElementById("status");
  const skipBtn = document.getElementById("skipBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  const emptyState = document.getElementById("emptyState");
  const galleryEl = document.getElementById("gallery");

  // Lightbox
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");

  console.log("DOM initialized.");

  /* --------------------------------------------------------------
   * LocalStorage Helpers
   * ------------------------------------------------------------ */

  function loadStore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { emailImages: {} };
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    console.log("Store updated:", store);
  }

  /* --------------------------------------------------------------
   * Email Validation & Submission
   * ------------------------------------------------------------ */

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    console.log("Submitted email:", email);

    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

    if (!emailPattern.test(email)) {
      console.warn("Invalid email:", email);
      emailInput.classList.add("invalid");
      emailInput.setAttribute("aria-invalid", "true");
      emailError.hidden = false;
      emailError.style.display = "block";
      emailError.textContent = "Please enter a valid email address.";
      return;
    }

    emailInput.classList.remove("invalid");
    emailInput.setAttribute("aria-invalid", "false");
    emailError.hidden = true;
    emailError.style.display = "none";

    handleAssign(email);
  });

  /* --------------------------------------------------------------
   * Preload a batch of Unsplash images
   * Called automatically when cache is low
   * ------------------------------------------------------------ */

  async function preloadImages() {
    if (isFetchingBatch || cachedImages.length > 5) return;

    console.log("Preloading a batch from Unsplash…");
    isFetchingBatch = true;

    try {
      const res = await fetch(
        "https://api.unsplash.com/search/photos?query=nature&orientation=landscape&per_page=20",
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (!res.ok) throw new Error(res.status);

      const data = await res.json();

      const newImages = data.results.map((p) => ({
        url: p.urls.regular,
        credit: {
          name: p.user.name,
          link: `${p.user.links.html}?utm_source=ImageAssign&utm_medium=referral`,
        },
      }));

      cachedImages.push(...newImages);
      console.log(`Added ${newImages.length} → Cached: ${cachedImages.length}`);
    } catch (err) {
      console.error("Batch preload failed:", err);
    } finally {
      isFetchingBatch = false;
    }
  }

  /* --------------------------------------------------------------
   * Load next image from cache into main UI
   * Falls back if no images available
   * ------------------------------------------------------------ */

  async function loadNewImage() {
    await preloadImages();

    if (cachedImages.length === 0) {
      console.warn("Cache empty. Using fallback.");
      const fallback = `https://placehold.co/600x400?text=No+Image`;
      currentImageUrl = fallback;
      imgEl.src = fallback;
      imgSkeleton.style.display = "none";
      imageMeta.textContent = "Temporary placeholder image";
      return;
    }

    const next = cachedImages.shift();
    currentImageUrl = next.url;
    imgEl.src = currentImageUrl;

    imgEl.onload = () => {
      imgSkeleton.style.display = "none";
      imageFrame.classList.add("ready");
      imageMeta.innerHTML = `Photo by <a href="${next.credit.link}" target="_blank" rel="noopener">${next.credit.name}</a> on Unsplash`;
    };

    // Continue filling cache proactively
    preloadImages();
  }

  /* --------------------------------------------------------------
   * Assign image to an email address
   * ------------------------------------------------------------ */

  function handleAssign(email) {
    if (!currentImageUrl) return console.error("No image loaded to assign.");

    const store = loadStore();
    const key = email.toLowerCase();

    if (!store.emailImages[key]) {
      store.emailImages[key] = [];
    }

    // ✅ Prevent duplicate assignment
    if (store.emailImages[key].includes(currentImageUrl)) {
      statusEl.textContent = "That image is already assigned to this email ❌";
      return;
    }

    store.emailImages[key].push(currentImageUrl);

    saveStore(store);
    renderGallery();
    loadNewImage();
    statusEl.textContent = `Assigned to ${email}`;
    emailInput.value = "";
  }

  /* --------------------------------------------------------------
   * Gallery Rendering (thumbnails grouped by email)
   * ------------------------------------------------------------ */

  function renderGallery() {
    const store = loadStore();
    const entries = Object.entries(store.emailImages);

    galleryEl.innerHTML = "";
    emptyState.style.display = entries.length === 0 ? "block" : "none";

    entries.forEach(([email, urls]) => {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.innerHTML = `<span class="email">${email}</span><span class="count">(${urls.length} images)</span>`;

      const row = document.createElement("div");
      row.className = "thumb-row";

      urls.forEach((url, idx) => {
        const wrapper = document.createElement("div");
        wrapper.className = "thumb-wrapper";

        const img = document.createElement("img");
        img.src = url;
        img.className = "thumb";
        img.alt = "assigned image";
        img.loading = "lazy";

        img.addEventListener("dblclick", () => {
          slideshowImages = [...urls];
          slideshowIndex = idx;
          openLightbox();
        });

        const delBtn = document.createElement("button");
        delBtn.className = "thumb-delete";
        delBtn.innerText = "✕";
        delBtn.addEventListener("click", () => {
          const updated = loadStore();
          updated.emailImages[email].splice(idx, 1);
          if (updated.emailImages[email].length === 0)
            delete updated.emailImages[email];
          saveStore(updated);
          renderGallery();
        });

        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        row.appendChild(wrapper);
      });

      details.appendChild(summary);
      details.appendChild(row);
      galleryEl.appendChild(details);
    });
  }

  /* --------------------------------------------------------------
   * Lightbox Controls
   * ------------------------------------------------------------ */

  function openLightbox() {
    lightboxImage.src = slideshowImages[slideshowIndex];
    lightbox.hidden = false;
  }

  function closeLightbox() {
    lightbox.hidden = true;
  }

  function showPrev() {
    slideshowIndex =
      (slideshowIndex - 1 + slideshowImages.length) % slideshowImages.length;
    openLightbox();
  }

  function showNext() {
    slideshowIndex = (slideshowIndex + 1) % slideshowImages.length;
    openLightbox();
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", showPrev);
  lightboxNext.addEventListener("click", showNext);

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPrev();
    if (e.key === "ArrowRight") showNext();
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target.classList.contains("lightbox-overlay")) closeLightbox();
  });

  /* --------------------------------------------------------------
   * Utility UI Controls
   * ------------------------------------------------------------ */

  skipBtn.addEventListener("click", loadNewImage);
  clearAllBtn.addEventListener("click", () => {
    if (!confirm("Clear all data?")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderGallery();
    loadNewImage();
  });

  /* --------------------------------------------------------------
   * Initial startup
   * ------------------------------------------------------------ */

  renderGallery();
  loadNewImage();
})();
