/**
 * GPU Server Tour – image cycling, hotspots, popup, reset on slide change.
 * Expects SERVER_TOUR_DATA (from data.js) and DOM elements with ids used below.
 */
(function () {
  "use strict";

  const data = typeof SERVER_TOUR_DATA !== "undefined" ? SERVER_TOUR_DATA : { images: [] };
  const images = data.images || [];
  const total = images.length;

  if (total === 0) {
    return;
  }

  let currentIndex = 0;
  let activeHotspotId = null;

  const el = {
    tourImage: document.getElementById("tour-image"),
    viewerImageInner: document.getElementById("viewer-image-inner"),
    hotspotLayer: document.getElementById("hotspot-layer"),
    imageStrip: document.getElementById("image-strip"),
    stripWrap: document.getElementById("strip-wrap"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    popup: document.getElementById("popup"),
    popupContent: document.getElementById("popup-content"),
    popupTitle: document.getElementById("popup-title"),
    popupBody: document.getElementById("popup-body"),
  };

  var closeOnClickOutside = function (e) {
    if (el.popup.hidden) return;
    if (el.popupContent && el.popupContent.contains(e.target)) return;
    closePopup();
    document.removeEventListener("click", closeOnClickOutside, true);
  };

  function sizeInnerToImage() {
    if (!el.viewerImageInner || !el.tourImage) return;
    const wrap = el.viewerImageInner.parentElement;
    if (!wrap) return;
    const img = el.tourImage;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return;
    const wrapW = wrap.clientWidth;
    const wrapH = wrap.clientHeight;
    const scale = Math.min(wrapW / nw, wrapH / nh, 1);
    const w = Math.round(nw * scale);
    const h = Math.round(nh * scale);
    el.viewerImageInner.style.width = w + "px";
    el.viewerImageInner.style.height = h + "px";
  }

  function getSlide() {
    return images[currentIndex] || null;
  }

  function setSlideIndex(index) {
    currentIndex = (index + total) % total;
  }

  function closePopup() {
    el.popup.hidden = true;
    activeHotspotId = null;
    clearActiveHotspot();
    document.removeEventListener("click", closeOnClickOutside, true);
  }

  function positionPopup(hotspotEl) {
    if (!el.popup || !el.popupContent || !hotspotEl) return;
    var rect = hotspotEl.getBoundingClientRect();
    var gap = 12;
    var spaceRight = window.innerWidth - rect.right;
    var spaceLeft = rect.left;
    el.popup.style.left = "";
    el.popup.style.right = "";
    el.popup.style.top = "";
    el.popup.style.transform = "";
    if (spaceRight >= spaceLeft) {
      el.popup.style.left = (rect.right + gap) + "px";
      el.popup.style.top = (rect.top + rect.height / 2) + "px";
      el.popup.style.transform = "translateY(-50%)";
    } else {
      el.popup.style.right = (window.innerWidth - rect.left + gap) + "px";
      el.popup.style.left = "auto";
      el.popup.style.top = (rect.top + rect.height / 2) + "px";
      el.popup.style.transform = "translateY(-50%)";
    }
    requestAnimationFrame(function () {
      var contentH = el.popupContent.offsetHeight;
      if (contentH <= 0) return;
      var maxTop = 8;
      var minBottom = window.innerHeight - 8;
      var topCenter = rect.top + rect.height / 2;
      if (topCenter - contentH / 2 < maxTop) {
        el.popup.style.top = (maxTop + contentH / 2) + "px";
        el.popup.style.transform = "translateY(-50%)";
      } else if (topCenter + contentH / 2 > minBottom) {
        el.popup.style.top = (minBottom - contentH / 2) + "px";
        el.popup.style.transform = "translateY(-50%)";
      }
    });
  }

  function clearActiveHotspot() {
    const active = el.hotspotLayer.querySelector(".hotspot-region.active");
    if (active) active.classList.remove("active");
  }

  function pointsToPath(points) {
    if (!points || points.length < 2) return "";
    function num(x) { return Number(x); }
    var d = "M " + num(points[0][0]) + " " + num(points[0][1]);
    for (var i = 1; i < points.length; i++) {
      d += " L " + num(points[i][0]) + " " + num(points[i][1]);
    }
    return d + " Z";
  }

  function getHotspotPoints(h, imgW, imgH) {
    var pts;
    if (h.pointsPx && h.pointsPx.length >= 4) {
      var srcW = Number(h.sourceWidth) || 1;
      var srcH = Number(h.sourceHeight) || 1;
      var scaleX = imgW / srcW;
      var scaleY = imgH / srcH;
      pts = [];
      for (var i = 0; i < h.pointsPx.length; i += 2) {
        pts.push([h.pointsPx[i] * scaleX, h.pointsPx[i + 1] * scaleY]);
      }
    } else if (h.points && h.points.length >= 2) {
      pts = h.points.map(function (p) {
        return [(p[0] / 100) * imgW, (p[1] / 100) * imgH];
      });
    }
    if (pts && pts.length >= 2) {
      var ox = Number(h.adjustOffsetX);
      var oy = Number(h.adjustOffsetY);
      if (isNaN(ox)) ox = Number(data.defaultAdjustOffsetX) || 0;
      if (isNaN(oy)) oy = Number(data.defaultAdjustOffsetY) || 0;
      if (ox !== 0 || oy !== 0) {
        for (var j = 0; j < pts.length; j++) {
          pts[j][0] += ox;
          pts[j][1] += oy;
        }
      }
      var scaleX = Number(h.adjustScaleX);
      var scaleY = Number(h.adjustScaleY);
      if ((!isNaN(scaleX) && scaleX > 0) || (!isNaN(scaleY) && scaleY > 0)) {
        var sx = !isNaN(scaleX) && scaleX > 0 ? scaleX : 1;
        var sy = !isNaN(scaleY) && scaleY > 0 ? scaleY : sx;
        var midX = 0, midY = 0;
        for (var k = 0; k < pts.length; k++) { midX += pts[k][0]; midY += pts[k][1]; }
        midX /= pts.length;
        midY /= pts.length;
        for (var k = 0; k < pts.length; k++) {
          pts[k][0] = midX + (pts[k][0] - midX) * sx;
          pts[k][1] = midY + (pts[k][1] - midY) * sy;
        }
      }
    }
    return pts;
  }

  function renderHotspots(slide) {
    el.hotspotLayer.innerHTML = "";
    if (!slide || !slide.hotspots || slide.hotspots.length === 0) return;

    var img = el.tourImage;
    var nw = img.naturalWidth || 100;
    var nh = img.naturalHeight || 100;

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "hotspot-svg");
    svg.setAttribute("viewBox", "0 0 " + nw + " " + nh);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    slide.hotspots.forEach(function (h) {
      var pts = getHotspotPoints(h, nw, nh);
      if (!pts || pts.length < 2) return;

      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "hotspot-region");
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      g.setAttribute("aria-label", h.label || h.id || "Learn more");
      g.dataset.hotspotId = h.id;

      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
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
        var id = this.dataset.hotspotId;
        if (activeHotspotId === id) {
          closePopup();
          return;
        }
        clearActiveHotspot();
        this.classList.add("active");
        activeHotspotId = id;
        showPopupContent(h.content);
        el.popup.hidden = false;
        positionPopup(this);
        setTimeout(function () {
          document.addEventListener("click", closeOnClickOutside, true);
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

    el.hotspotLayer.appendChild(svg);
  }

  function showPopupContent(content) {
    if (!content) return;
    const title = typeof content === "string" ? content : (content.title || "");
    const parts = [];
    if (content.what) parts.push(content.what);
    if (content.role) parts.push(content.role);
    if (content.integration) parts.push(content.integration);
    el.popupTitle.textContent = title;
    el.popupBody.innerHTML = parts.map(function (p) { return "<p>" + escapeHtml(p) + "</p>"; }).join("");
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function buildStrip() {
    el.imageStrip.innerHTML = "";
    images.forEach(function (slide, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "strip-item";
      btn.setAttribute("aria-label", "View " + (slide.alt || "image " + (i + 1)));
      btn.dataset.index = String(i);
      const img = document.createElement("img");
      img.src = slide.src;
      img.alt = "";
      img.loading = "lazy";
      btn.appendChild(img);
      btn.addEventListener("click", function () {
        goToSlide(parseInt(this.dataset.index, 10));
      });
      el.imageStrip.appendChild(btn);
    });
  }

  function updateStripZoom() {
    const items = el.imageStrip.querySelectorAll(".strip-item");
    items.forEach(function (item, i) {
      item.classList.toggle("strip-center", i === currentIndex);
    });
    const centerItem = el.imageStrip.querySelector(".strip-item[data-index=\"" + currentIndex + "\"]");
    if (centerItem) {
      centerItem.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }

  function goToSlide(index) {
    setSlideIndex(index);
    closePopup();
    const slide = getSlide();
    if (!slide) return;

    el.tourImage.alt = slide.alt || "";
    if (el.tourImage.src !== slide.src) {
      el.tourImage.onload = function () {
        el.tourImage.onload = null;
        sizeInnerToImage();
        renderHotspots(getSlide());
      };
      el.tourImage.src = slide.src;
      if (el.tourImage.complete) {
        el.tourImage.onload = null;
        sizeInnerToImage();
        renderHotspots(getSlide());
      }
    } else {
      sizeInnerToImage();
    }

    el.btnPrev.disabled = total <= 1;
    el.btnNext.disabled = total <= 1;

    if (el.tourImage.naturalWidth && el.tourImage.naturalHeight) {
      renderHotspots(slide);
    }
    updateStripZoom();
  }

  function prev() {
    goToSlide(currentIndex - 1);
  }

  function next() {
    goToSlide(currentIndex + 1);
  }

  el.btnPrev.addEventListener("click", prev);
  el.btnNext.addEventListener("click", next);


  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!el.popup.hidden) {
        closePopup();
        e.preventDefault();
      }
      return;
    }
    if (el.popup.hidden && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      if (e.key === "ArrowLeft") prev();
      else next();
    }
  });

  window.addEventListener("resize", sizeInnerToImage);

  buildStrip();
  goToSlide(0);
})();
