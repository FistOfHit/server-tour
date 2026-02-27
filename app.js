/**
 * GPU Server Tour – image cycling, hotspots, popup, reset on slide change.
 * Expects SERVER_TOUR_DATA (from data.js) and DOM elements with ids documented in index.html.
 *
 * Structure: state, dom (refs + layout), geometry (hotspot coordinates), popup, navigation, viewer (hotspot overlay).
 * Startup: initData() → initDom() → initEvents() → initViewer().
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Data and validation (initData)
  // ---------------------------------------------------------------------------
  const data =
    typeof SERVER_TOUR_DATA !== "undefined" ? SERVER_TOUR_DATA : { images: [] };
  const images = Array.isArray(data.images) ? data.images : [];
  const total = images.length;

  function initData() {
    if (total === 0) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          "GPU Server Tour: SERVER_TOUR_DATA.images is missing or empty. Add image entries in data.js."
        );
      }
      const viewer = document.querySelector(".viewer");
      if (viewer) {
        viewer.innerHTML =
          '<p class="viewer-message" role="status">No tour images. Add entries to data.js.</p>';
      }
      return false;
    }
    for (let i = 0; i < images.length; i++) {
      const slide = images[i];
      if (
        !slide ||
        typeof slide.id !== "string" ||
        typeof slide.src !== "string" ||
        typeof slide.alt !== "string" ||
        !Array.isArray(slide.hotspots)
      ) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            "GPU Server Tour: Invalid slide at index " +
              i +
              "; expected { id, src, alt, hotspots }."
          );
        }
      }
    }
    return true;
  }

  if (!initData()) return;

  // ---------------------------------------------------------------------------
  // State (current slide index and active hotspot)
  // ---------------------------------------------------------------------------
  let currentIndex = 0;
  let activeHotspotId = null;
  /** @type {Element | null} Hotspot element that opened the popup, for focus return */
  let popupTriggerEl = null;

  // Auto tour: cyclic slideshow through images and hotspots
  const HOTSPOT_DURATION_MS = 5000;
  const SLIDE_EMPTY_DURATION_MS = 2000;
  let autoTourActive = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let autoTourTimeoutId = null;
  let autoTourHotspotIndex = 0;

  /** @returns {{ id: string, src: string, alt?: string, hotspots: object[] } | null} */
  function getSlide() {
    return images[currentIndex] || null;
  }

  /** @param {number} index */
  function setSlideIndex(index) {
    currentIndex = (index + total) % total;
  }

  // ---------------------------------------------------------------------------
  // DOM – cached element references and layout helpers
  // ---------------------------------------------------------------------------
  const dom = {
    tourImage: document.getElementById("tour-image"),
    viewerImageInner: document.getElementById("viewer-image-inner"),
    hotspotLayer: document.getElementById("hotspot-layer"),
    imageStrip: document.getElementById("image-strip"),
    stripWrap: document.getElementById("strip-wrap"),
    btnAutoTour: document.getElementById("btn-auto-tour"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    popup: document.getElementById("popup"),
    popupContent: document.getElementById("popup-content"),
    popupTitle: document.getElementById("popup-title"),
    popupBody: document.getElementById("popup-body"),
    viewerFadeOverlay: document.getElementById("viewer-fade-overlay"),
  };

  /**
   * Sizes the viewer inner container to fit the current image while preserving aspect ratio (scale ≤ 1).
   */
  function sizeInnerToImage() {
    if (!dom.viewerImageInner || !dom.tourImage) return;
    const wrap = dom.viewerImageInner.parentElement;
    if (!wrap) return;
    const img = dom.tourImage;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return;
    const wrapW = wrap.clientWidth;
    const wrapH = wrap.clientHeight;
    const scale = Math.min(wrapW / nw, wrapH / nh, 1);
    const w = Math.round(nw * scale);
    const h = Math.round(nh * scale);
    dom.viewerImageInner.style.width = w + "px";
    dom.viewerImageInner.style.height = h + "px";
  }

  /**
   * @param {string} s
   * @returns {string}
   */
  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Geometry – hotspot polygon coordinates and SVG path
  // ---------------------------------------------------------------------------

  /**
   * Converts an array of [x,y] points to an SVG path d string (M ... L ... Z).
   * @param {number[][]} points
   * @returns {string}
   */
  function pointsToPath(points) {
    if (!points || points.length < 2) return "";
    const num = function (x) {
      return Number(x);
    };
    let d = "M " + num(points[0][0]) + " " + num(points[0][1]);
    for (let i = 1; i < points.length; i++) {
      d += " L " + num(points[i][0]) + " " + num(points[i][1]);
    }
    return d + " Z";
  }

  /**
   * Computes scaled and optionally adjusted polygon points for a hotspot.
   * Uses pointsPx + sourceWidth/sourceHeight, or fallback points (percentages).
   * @param {object} h - Hotspot object (pointsPx, sourceWidth, sourceHeight, etc.; see data.js)
   * @param {number} imgW
   * @param {number} imgH
   * @returns {number[][] | undefined}
   */
  function getHotspotPoints(h, imgW, imgH) {
    let pts;
    if (h.pointsPx && h.pointsPx.length >= 4) {
      const srcW = Number(h.sourceWidth) || 1;
      const srcH = Number(h.sourceHeight) || 1;
      const scaleX = imgW / srcW;
      const scaleY = imgH / srcH;
      pts = [];
      for (let i = 0; i < h.pointsPx.length; i += 2) {
        pts.push([h.pointsPx[i] * scaleX, h.pointsPx[i + 1] * scaleY]);
      }
    } else if (h.points && h.points.length >= 2) {
      pts = h.points.map(function (p) {
        return [(p[0] / 100) * imgW, (p[1] / 100) * imgH];
      });
    }
    if (pts && pts.length >= 2) {
      let ox = Number(h.adjustOffsetX);
      let oy = Number(h.adjustOffsetY);
      if (isNaN(ox)) ox = Number(data.defaultAdjustOffsetX) || 0;
      if (isNaN(oy)) oy = Number(data.defaultAdjustOffsetY) || 0;
      if (ox !== 0 || oy !== 0) {
        for (let j = 0; j < pts.length; j++) {
          pts[j][0] += ox;
          pts[j][1] += oy;
        }
      }
      const scaleX = Number(h.adjustScaleX);
      const scaleY = Number(h.adjustScaleY);
      if ((!isNaN(scaleX) && scaleX > 0) || (!isNaN(scaleY) && scaleY > 0)) {
        const sx = !isNaN(scaleX) && scaleX > 0 ? scaleX : 1;
        const sy = !isNaN(scaleY) && scaleY > 0 ? scaleY : sx;
        let midX = 0,
          midY = 0;
        for (let k = 0; k < pts.length; k++) {
          midX += pts[k][0];
          midY += pts[k][1];
        }
        midX /= pts.length;
        midY /= pts.length;
        for (let k = 0; k < pts.length; k++) {
          pts[k][0] = midX + (pts[k][0] - midX) * sx;
          pts[k][1] = midY + (pts[k][1] - midY) * sy;
        }
      }
    }
    return pts;
  }

  // ---------------------------------------------------------------------------
  // Popup – show, position, close, and clear active hotspot
  // ---------------------------------------------------------------------------

  function clearActiveHotspot() {
    const active = dom.hotspotLayer.querySelector(".hotspot-region.active");
    if (active) active.classList.remove("active");
  }

  function closePopup() {
    if (popupTriggerEl) {
      popupTriggerEl.focus();
      popupTriggerEl = null;
    }
    dom.popup.hidden = true;
    activeHotspotId = null;
    clearActiveHotspot();
    document.removeEventListener("click", handleCloseOnClickOutside, true);
    dom.popupContent.removeEventListener("keydown", handlePopupKeydown);
  }

  /**
   * Keeps focus inside the popup when Tab/Shift+Tab is pressed.
   * @param {KeyboardEvent} e
   */
  function handlePopupKeydown(e) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    dom.popupContent.focus();
  }

  /**
   * @param {MouseEvent} e
   */
  function handleCloseOnClickOutside(e) {
    if (dom.popup.hidden) return;
    if (dom.popupContent && dom.popupContent.contains(e.target)) return;
    closePopup();
    document.removeEventListener("click", handleCloseOnClickOutside, true);
  }

  /**
   * Positions the popup near the hotspot, preferring the side with more space; clamps to viewport.
   * @param {Element} hotspotEl
   */
  function positionPopup(hotspotEl) {
    if (!dom.popup || !dom.popupContent || !hotspotEl) return;
    const rect = hotspotEl.getBoundingClientRect();
    const gap = 12;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const spaceRight = screenWidth - rect.right;
    const spaceLeft = rect.left;
    dom.popup.style.left = "";
    dom.popup.style.right = "";
    dom.popup.style.top = "";
    dom.popup.style.transform = "";
    dom.popup.style.bottom = "";

    const popupWidth = dom.popupContent.offsetWidth || 380;
    const showOnRight = spaceRight >= spaceLeft;

    if (showOnRight && rect.right + gap + popupWidth <= screenWidth) {
      dom.popup.style.left = rect.right + gap + "px";
    } else if (!showOnRight && rect.left - gap - popupWidth >= 0) {
      dom.popup.style.right = screenWidth - rect.left + gap + "px";
      dom.popup.style.left = "auto";
    } else {
      dom.popup.style.left = rect.left + rect.width / 2 + "px";
      dom.popup.style.right = "auto";
      dom.popup.style.transform = "translate(-50%, -50%)";
    }

    dom.popup.style.top = rect.top + rect.height / 2 + "px";

    requestAnimationFrame(function () {
      const contentW = dom.popupContent.offsetWidth;
      const contentH = dom.popupContent.offsetHeight;
      if (contentW <= 0 || contentH <= 0) return;

      const maxLeft = 8;
      const maxRight = screenWidth - 8;
      const maxTop = 8;
      const maxBottom = screenHeight - 8;
      const popupRect = dom.popup.getBoundingClientRect();

      if (popupRect.right > maxRight) {
        dom.popup.style.left = maxRight - contentW + "px";
      }
      if (popupRect.left < maxLeft) {
        dom.popup.style.left = maxLeft + "px";
      }

      const topCenter = rect.top + rect.height / 2;
      const proposedTop = topCenter - contentH / 2;

      if (proposedTop < maxTop) {
        dom.popup.style.top = maxTop + contentH / 2 + "px";
      } else if (topCenter + contentH / 2 > maxBottom) {
        dom.popup.style.top = maxBottom - contentH / 2 + "px";
      }
    });
  }

  /**
   * Fills popup title and body from hotspot content (title, what, role, optional integration).
   * @param {string | { title?: string, what?: string, role?: string, integration?: string }} content
   */
  function showPopupContent(content) {
    if (!content) return;
    const title = typeof content === "string" ? content : content.title || "";
    const parts = [];
    if (content.what) parts.push(content.what);
    if (content.role) parts.push(content.role);
    if (content.integration) parts.push(content.integration);
    dom.popupTitle.textContent = title;
    dom.popupBody.innerHTML = parts
      .map(function (p) {
        return "<p>" + escapeHtml(String(p)) + "</p>";
      })
      .join("");
  }

  // ---------------------------------------------------------------------------
  // Viewer – render SVG hotspot overlay for the current slide
  // ---------------------------------------------------------------------------

  /**
   * Builds the SVG overlay with one polygon per hotspot; skips malformed hotspots with a console warning.
   * @param {{ id: string, src: string, alt?: string, hotspots: object[] } | null} slide
   */
  function renderHotspots(slide) {
    dom.hotspotLayer.innerHTML = "";
    if (!slide || !slide.hotspots || slide.hotspots.length === 0) return;

    const img = dom.tourImage;
    const nw = img.naturalWidth || 100;
    const nh = img.naturalHeight || 100;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "hotspot-svg");
    svg.setAttribute("viewBox", "0 0 " + nw + " " + nh);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    slide.hotspots.forEach(function (h) {
      const pts = getHotspotPoints(h, nw, nh);
      if (!pts || pts.length < 2) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            "GPU Server Tour: Skipping hotspot '" +
              (h.id || "?") +
              "' – missing or invalid coordinates."
          );
        }
        return;
      }

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "hotspot-region");
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      g.setAttribute("aria-label", h.label || h.id || "Learn more");
      g.dataset.hotspotId = h.id;

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", pointsToPath(pts));
      path.setAttribute("fill", "transparent");
      g.appendChild(path);

      g.addEventListener("mouseenter", function () {
        this.classList.add("hover");
      });
      g.addEventListener("mouseleave", function () {
        this.classList.remove("hover");
      });
      g.addEventListener("click", function (e) {
        e.preventDefault();
        stopAutoTour();
        const id = this.dataset.hotspotId;
        if (activeHotspotId === id) {
          closePopup();
          return;
        }
        clearActiveHotspot();
        this.classList.add("active");
        activeHotspotId = id;
        popupTriggerEl = this;
        showPopupContent(h.content);
        dom.popup.hidden = false;
        positionPopup(this);
        setTimeout(function () {
          dom.popupContent.focus();
          dom.popupContent.addEventListener("keydown", handlePopupKeydown);
          document.addEventListener("click", handleCloseOnClickOutside, true);
        }, 0);
      });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.click();
        }
      });

      svg.appendChild(g);
    });

    dom.hotspotLayer.appendChild(svg);
  }

  // ---------------------------------------------------------------------------
  // Navigation – strip, goToSlide, prev, next
  // ---------------------------------------------------------------------------

  function buildStrip() {
    dom.imageStrip.innerHTML = "";
    images.forEach(function (slide, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "strip-item";
      btn.setAttribute(
        "aria-label",
        "View " + (slide.alt || "image " + (i + 1))
      );
      btn.dataset.index = String(i);
      const thumbImg = document.createElement("img");
      thumbImg.src = slide.src;
      thumbImg.alt = "";
      thumbImg.loading = "lazy";
      btn.appendChild(thumbImg);
      btn.addEventListener("click", function () {
        stopAutoTour();
        goToSlide(parseInt(this.dataset.index, 10));
      });
      dom.imageStrip.appendChild(btn);
    });
  }

  function updateStripZoom() {
    const items = dom.imageStrip.querySelectorAll(".strip-item");
    items.forEach(function (item, i) {
      item.classList.toggle("strip-center", i === currentIndex);
    });
    const centerItem = dom.imageStrip.querySelector(
      '.strip-item[data-index="' + currentIndex + '"]'
    );
    if (centerItem) {
      centerItem.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
    }
  }

  /**
   * Shows a fallback message in the viewer when the current image fails to load.
   */
  function showImageLoadError() {
    dom.tourImage.onerror = null;
    dom.tourImage.onload = null;
    dom.tourImage.style.display = "none";
    let fallback = dom.viewerImageInner.querySelector(".viewer-image-fallback");
    if (!fallback) {
      fallback = document.createElement("p");
      fallback.className = "viewer-image-fallback";
      fallback.setAttribute("role", "status");
      dom.viewerImageInner.appendChild(fallback);
    }
    fallback.textContent = "Image failed to load.";
    fallback.style.display = "";
  }

  /**
   * Applies the new slide image and updates UI. Called after fade-out or directly when not fading.
   * @param {{ id: string, src: string, alt?: string, hotspots: object[] }} slide
   */
  function applyNewImage(slide) {
    dom.tourImage.style.display = "";
    const fallback = dom.viewerImageInner.querySelector(
      ".viewer-image-fallback"
    );
    if (fallback) fallback.style.display = "none";

    dom.tourImage.alt = slide.alt || "";
    if (dom.tourImage.src !== slide.src) {
      dom.tourImage.onload = function () {
        dom.tourImage.onload = null;
        dom.tourImage.onerror = null;
        sizeInnerToImage();
        renderHotspots(getSlide());
        if (dom.viewerFadeOverlay) {
          dom.viewerFadeOverlay.style.transition = "opacity 0.125s ease";
          dom.viewerFadeOverlay.style.opacity = "0";
        }
      };
      dom.tourImage.onerror = showImageLoadError;
      dom.tourImage.src = slide.src;
      if (dom.tourImage.complete && dom.tourImage.naturalWidth > 0) {
        dom.tourImage.onload = null;
        dom.tourImage.onerror = null;
        sizeInnerToImage();
        renderHotspots(getSlide());
        if (dom.viewerFadeOverlay) {
          dom.viewerFadeOverlay.style.transition = "opacity 0.125s ease";
          dom.viewerFadeOverlay.style.opacity = "0";
        }
      }
    } else {
      sizeInnerToImage();
    }

    dom.btnPrev.disabled = total <= 1;
    dom.btnNext.disabled = total <= 1;

    if (dom.tourImage.naturalWidth && dom.tourImage.naturalHeight) {
      renderHotspots(slide);
    }
    updateStripZoom();
  }

  /**
   * Switches to the slide at the given index: fades out (if changing image), updates image, fades in.
   * @param {number} index
   */
  function goToSlide(index) {
    setSlideIndex(index);
    closePopup();
    const slide = getSlide();
    if (!slide) return;

    const changingImage = dom.tourImage.src !== slide.src;
    const shouldFade =
      changingImage &&
      dom.tourImage.src &&
      dom.viewerFadeOverlay;

    if (shouldFade) {
      dom.viewerFadeOverlay.style.transition = "opacity 0.125s ease";
      dom.viewerFadeOverlay.style.opacity = "1";
      dom.viewerFadeOverlay.addEventListener(
        "transitionend",
        function onFadeOutEnd(e) {
          if (
            e.target !== dom.viewerFadeOverlay ||
            e.propertyName !== "opacity"
          ) {
            return;
          }
          dom.viewerFadeOverlay.removeEventListener(
            "transitionend",
            onFadeOutEnd
          );
          applyNewImage(slide);
        }
      );
    } else {
      applyNewImage(slide);
    }
  }

  function prev() {
    stopAutoTour();
    goToSlide(currentIndex - 1);
  }

  function next() {
    stopAutoTour();
    goToSlide(currentIndex + 1);
  }

  // ---------------------------------------------------------------------------
  // Auto tour – cyclic slideshow through images and hotspots
  // ---------------------------------------------------------------------------

  function stopAutoTour() {
    if (autoTourTimeoutId !== null) {
      clearTimeout(autoTourTimeoutId);
      autoTourTimeoutId = null;
    }
    autoTourActive = false;
    closePopup();
    clearActiveHotspot();
    if (dom.btnAutoTour) {
      dom.btnAutoTour.textContent = "Start tour";
      dom.btnAutoTour.setAttribute("aria-label", "Start auto tour");
    }
  }

  function startAutoTour() {
    stopAutoTour();
    autoTourActive = true;
    autoTourHotspotIndex = 0;
    if (dom.btnAutoTour) {
      dom.btnAutoTour.textContent = "Stop tour";
      dom.btnAutoTour.setAttribute("aria-label", "Stop auto tour");
    }
    goToSlide(0);
    autoTourTimeoutId = setTimeout(autoTourStep, SLIDE_EMPTY_DURATION_MS);
  }

  /**
   * Returns one hotspot per type (by label) so the tour doesn't repeat e.g. every "Host memory (RAM)".
   * @param {object[]} hotspots
   * @returns {object[]}
   */
  function uniqueHotspotsByLabel(hotspots) {
    const seen = Object.create(null);
    const out = [];
    for (let i = 0; i < hotspots.length; i++) {
      const h = hotspots[i];
      const key = (h.label || h.id || "").trim();
      if (key && !seen[key]) {
        seen[key] = true;
        out.push(h);
      }
    }
    return out;
  }

  function autoTourStep() {
    if (!autoTourActive) return;
    const slide = getSlide();
    if (!slide) return;
    const allHotspots = slide.hotspots || [];
    const hotspots = uniqueHotspotsByLabel(allHotspots);

    if (hotspots.length > 0 && autoTourHotspotIndex < hotspots.length) {
      const h = hotspots[autoTourHotspotIndex];
      const el = dom.hotspotLayer.querySelector(
        '[data-hotspot-id="' + h.id + '"]'
      );
      if (el) {
        clearActiveHotspot();
        el.classList.add("active");
        activeHotspotId = h.id;
        popupTriggerEl = el;
        showPopupContent(h.content);
        dom.popup.hidden = false;
        positionPopup(el);
      }
      autoTourHotspotIndex += 1;
      autoTourTimeoutId = setTimeout(
        autoTourStep,
        HOTSPOT_DURATION_MS
      );
    } else {
      autoTourHotspotIndex = 0;
      const nextIndex = (currentIndex + 1) % total;
      goToSlide(nextIndex);
      autoTourTimeoutId = setTimeout(
        autoTourStep,
        SLIDE_EMPTY_DURATION_MS
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Event handlers (named for clarity)
  // ---------------------------------------------------------------------------

  /**
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === "Escape") {
      if (autoTourActive) {
        stopAutoTour();
        e.preventDefault();
      } else if (!dom.popup.hidden) {
        closePopup();
        e.preventDefault();
      }
      return;
    }
    if (dom.popup.hidden && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      if (e.key === "ArrowLeft") prev();
      else next();
    }
  }

  // ---------------------------------------------------------------------------
  // Initialization: initDom, initEvents, initViewer
  // ---------------------------------------------------------------------------

  function initDom() {
    // Elements are already cached in dom; no extra setup needed.
  }

  function initEvents() {
    if (dom.btnAutoTour) {
      dom.btnAutoTour.addEventListener("click", function () {
        if (autoTourActive) {
          stopAutoTour();
        } else {
          startAutoTour();
        }
      });
    }
    dom.btnPrev.addEventListener("click", prev);
    dom.btnNext.addEventListener("click", next);
    document.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", sizeInnerToImage);
  }

  function initViewer() {
    buildStrip();
    goToSlide(0);
  }

  initDom();
  initEvents();
  initViewer();
})();
