console.log(
  "%c✅ Script loaded & running!",
  "color: #4ade80; font-size:16px; font-weight:bold;"
);

(function () {
  "use strict";

  const STORAGE_KEY = "emailImages.v1";

  const UNSPLASH_ACCESS_KEY = "EutaxUDh0GyczRPGpYk-KRUjCnzRHnPii8b0Fe4j6Uw";

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

  // ✅ Lightbox Elements
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");

  let currentImageUrl = null;
  let slideshowImages = [];
  let slideshowIndex = 0;

  console.log("🎬 Script initialized and UI ready.");

  // Local Storage
  function loadStore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { emailImages: {} };
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    console.log("💾 Store:", store);
  }

  // Gallery Renderer
  function renderGallery() {
    console.log("🔁 Rendering gallery");
    const store = loadStore();
    const entries = Object.entries(store.emailImages);

    galleryEl.innerHTML = "";
    emptyState.style.display = entries.length === 0 ? "block" : "none";

    entries.forEach(([email, urls]) => {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.innerHTML = `<span class="email">${email}</span>
                           <span class="count">(${urls.length} images)</span>`;

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
        delBtn.innerHTML = "✕";
        delBtn.title = "Delete this image";

        delBtn.addEventListener("click", () => {
          if (!confirm("Remove this image?")) return;

          const updatedStore = loadStore();
          updatedStore.emailImages[email].splice(idx, 1);
          if (updatedStore.emailImages[email].length === 0)
            delete updatedStore.emailImages[email];

          saveStore(updatedStore);
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

  // Load New Unsplash Image
  function loadNewImage() {
    console.log("🎞 Fetching Unsplash image…");

    imageFrame.classList.remove("ready");
    imgSkeleton.style.display = "block";
    imageMeta.textContent = "";
    statusEl.textContent = "Loading…";

    const apiUrl =
      "https://api.unsplash.com/photos/random?query=nature&orientation=landscape";

    fetch(apiUrl, {
      headers: {
        // Only use Access Key
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        currentImageUrl = data.urls.regular;
        imgEl.src = currentImageUrl;

        imgEl.onload = () => {
          console.log("✅ Image loaded:", currentImageUrl);
          imgSkeleton.style.display = "none";
          imageFrame.classList.add("ready");
          statusEl.textContent = "";

          // Required Unsplash attribution
          imageMeta.innerHTML = `Photo by 
            <a href="${data.user.links.html}?utm_source=ImageAssign&utm_medium=referral" 
            target="_blank" rel="noopener">${data.user.name}</a> 
            on Unsplash`;
        };
      })
      .catch((err) => {
        console.error("❌ Unsplash load failed", err);
        const fallback = `https://placehold.co/600x400?text=No+Image`;
        currentImageUrl = fallback;
        imgEl.src = fallback;
        imgSkeleton.style.display = "none";
        statusEl.textContent = "⚠️ Fallback used";
        imageMeta.textContent = "Temporary placeholder image";
      });
  }

  // Assign Image
  function handleAssign(email) {
    if (!currentImageUrl) return console.error("❌ No image loaded to assign");

    const store = loadStore();
    const key = email.toLowerCase();
    if (!store.emailImages[key]) store.emailImages[key] = [];
    store.emailImages[key].push(currentImageUrl);

    saveStore(store);
    renderGallery();
    loadNewImage();
    statusEl.textContent = `✅ Assigned to ${email}`;
    emailInput.value = "";
  }

  // UI Listeners
  // ✅ Fully Improved Email Validation & UI Update
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let email = emailInput.value.trim().toLowerCase();
    console.log("✉️ Raw email input:", email);

    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

    const isValid = emailPattern.test(email);
    console.log("✅ Regex test result:", isValid);

    if (!isValid) {
      console.warn("⛔ Email failed validation:", email);

      emailInput.classList.add("invalid");
      emailInput.setAttribute("aria-invalid", "true");

      emailError.hidden = false;
      emailError.style.display = "block";
      emailError.textContent = "Please enter a valid email address.";

      console.log("❌ Validation UI updated – stopped submission.");
      return;
    }

    console.log("🎉 Email validated successfully:", email);

    // ✅ Clear error UI
    emailInput.classList.remove("invalid");
    emailInput.setAttribute("aria-invalid", "false");
    emailError.hidden = true;
    emailError.style.display = "none";

    // ✅ Debug store before assign
    console.log("📦 Store before update:", loadStore());

    console.log("➡️ Calling handleAssign()...");
    handleAssign(email);

    console.log("✅ Assign completed");
  });

  skipBtn.addEventListener("click", loadNewImage);
  clearAllBtn.addEventListener("click", () => {
    if (!confirm("Clear all images?")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderGallery();
    loadNewImage();
  });

  // Lightbox Controls
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

  lightbox.addEventListener("click", (e) => {
    if (e.target.classList.contains("lightbox-overlay")) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPrev();
    if (e.key === "ArrowRight") showNext();
  });

  // Initial Load
  renderGallery();
  loadNewImage();
})();
