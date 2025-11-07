/**
 * ImageAssign Application Script
 * ---------------------------------
 */

(function () {
  "use strict";

  /* --------------------------------------------------------------
   * Configuration
   * ------------------------------------------------------------ */
  const STORAGE_KEY = "emailImages.v1";
  const UNSPLASH_ACCESS_KEY = "EutaxUDh0GyczRPGpYk-KRUjCnzRHnPii8b0Fe4j6Uw";
  const DEBUG = false; // set to true for dev logging

  /* --------------------------------------------------------------
   * State
   * ------------------------------------------------------------ */
  let cachedImages = [];
  let isFetchingBatch = false;
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

  if (DEBUG) console.log("DOM initialized.");

  /* --------------------------------------------------------------
   * LocalStorage Helpers
   * ------------------------------------------------------------ */
  function loadStore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { emailImages: {} };
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    if (DEBUG) console.log("Store updated:", store);
  }

  /* --------------------------------------------------------------
   * Preload Unsplash Images
   * ------------------------------------------------------------ */
  async function preloadImages() {
    if (isFetchingBatch || cachedImages.length > 5) return;
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
      if (DEBUG)
        console.log(
          `Added ${newImages.length} → Cached: ${cachedImages.length}`
        );
    } catch (err) {
      if (DEBUG) console.error("Batch preload failed:", err);
    } finally {
      isFetchingBatch = false;
    }
  }

  /* --------------------------------------------------------------
   * Load New Image
   * ------------------------------------------------------------ */
  async function loadNewImage() {
    await preloadImages();

    if (cachedImages.length === 0) {
      if (DEBUG) console.warn("Cache empty. Using fallback.");
      const fallback = `https://placehold.co/600x400?text=No+Image`;
      currentImageUrl = fallback;
      imgEl.src = fallback;
      imgSkeleton.style.display = "none";
      imageMeta.textContent = "Placeholder image";
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

    preloadImages(); // keep cache topped up
  }

  /* --------------------------------------------------------------
   * Populate Dropdown (existing emails)
   * ------------------------------------------------------------ */
  function populateEmailDropdown() {
    const store = loadStore();
    const emails = Object.keys(store.emailImages);

    let list = document.getElementById("emailList");
    if (!list) {
      list = document.createElement("datalist");
      list.id = "emailList";
      emailInput.setAttribute("list", "emailList");
      document.body.appendChild(list);
    }

    list.innerHTML = "";
    emails.forEach((email) => {
      const option = document.createElement("option");
      option.value = email;
      list.appendChild(option);
    });
  }

  /* --------------------------------------------------------------
   * Expand the relevant collection when selecting an email
   * ------------------------------------------------------------ */
  emailInput.addEventListener("change", () => {
    const selectedEmail = emailInput.value.trim().toLowerCase();
    const allDetails = document.querySelectorAll("#gallery details");

    // Collapse all collections first
    allDetails.forEach((d) => (d.open = false));

    // Find the section matching the selected email
    const target = document.querySelector(
      `details[data-email="${selectedEmail}"]`
    );

    if (target) {
      // Toggle behavior: if already open, close it
      if (target.open) {
        target.open = false;
      } else {
        target.open = true;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });

  /* --------------------------------------------------------------
   * Handle Assign
   * ------------------------------------------------------------ */
  function handleAssign(email) {
    if (!currentImageUrl) {
      if (DEBUG) console.error("No image loaded to assign.");
      return;
    }

    const store = loadStore();
    const key = email.toLowerCase();

    if (!store.emailImages[key]) store.emailImages[key] = [];

    // Avoid duplicates
    if (store.emailImages[key].includes(currentImageUrl)) {
      statusEl.textContent = "This image is already assigned to this email.";
      return;
    }

    store.emailImages[key].push(currentImageUrl);
    saveStore(store);
    renderGallery();

    // Auto-expand the assigned email's section
    const targetDetails = document.querySelector(
      `details[data-email="${email}"]`
    );
    if (targetDetails) {
      targetDetails.open = true;
      targetDetails.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // ✅ Keep same image visible so it can be assigned to another email
    statusEl.textContent = `Assigned to ${email}. You can assign it to another email.`;
  }

  /* --------------------------------------------------------------
   * Email Validation & Submit
   * ------------------------------------------------------------ */
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

    if (!emailPattern.test(email)) {
      emailError.hidden = false;
      emailError.textContent = "Please enter a valid email address.";
      return;
    }

    emailError.hidden = true;
    handleAssign(email);
  });

  /* --------------------------------------------------------------
   * Gallery Renderer
   * ------------------------------------------------------------ */
  function renderGallery() {
    const store = loadStore();
    const entries = Object.entries(store.emailImages);

    galleryEl.innerHTML = "";
    emptyState.style.display = entries.length === 0 ? "block" : "none";

    entries.forEach(([email, urls]) => {
      const details = document.createElement("details");
      details.dataset.email = email; // Expand only for current user

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
        delBtn.textContent = "✕";
        delBtn.addEventListener("click", () => {
          const updated = loadStore();
          updated.emailImages[email].splice(idx, 1);
          if (updated.emailImages[email].length === 0)
            delete updated.emailImages[email];
          saveStore(updated);
          renderGallery();
          statusEl.textContent = "Image removed.";
        });

        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        row.appendChild(wrapper);
      });

      details.appendChild(summary);
      details.appendChild(row);
      galleryEl.appendChild(details);
    });

    populateEmailDropdown();
  }

  /* --------------------------------------------------------------
   * Lightbox
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
   * Toolbar Buttons
   * ------------------------------------------------------------ */
  skipBtn.addEventListener("click", loadNewImage);
  clearAllBtn.addEventListener("click", () => {
    if (!confirm("Clear all data?")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderGallery();
    loadNewImage();
  });

  /* --------------------------------------------------------------
   * Initialize
   * ------------------------------------------------------------ */
  renderGallery();
  loadNewImage();
})();
