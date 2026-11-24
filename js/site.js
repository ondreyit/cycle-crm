(function () {
  "use strict";

  var toggle = document.querySelector("[data-nav-toggle]");
  var drawer = document.querySelector("[data-nav-drawer]");

  function setNav(open) {
    if (!toggle || !drawer) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    drawer.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
  }

  if (toggle && drawer) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setNav(false);
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setNav(false);
    });
  }

  var header = document.querySelector("[data-header]");
  var indicator = document.querySelector("[data-nav-indicator]");
  var sectionLinks = drawer ? Array.prototype.slice.call(drawer.querySelectorAll('a[href^="#"]')) : [];
  var sections = sectionLinks.map(function (link) {
    return document.querySelector(link.getAttribute("href"));
  }).filter(Boolean);
  var wideNav = window.matchMedia("(min-width: 861px)");

  function placeIndicator(link) {
    if (!indicator || !drawer) return;
    if (!link || !wideNav.matches) {
      indicator.hidden = true;
      return;
    }
    var parent = drawer.getBoundingClientRect();
    var box = link.getBoundingClientRect();
    indicator.hidden = false;
    indicator.style.left = (box.left - parent.left) + "px";
    indicator.style.width = box.width + "px";
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sheets = Array.prototype.map.call(document.querySelectorAll("main > section"), function (section) {
    return {
      section: section,
      wrap: section.querySelector(":scope > .wrap")
    };
  });
  var scrollDir = 1;
  var lastScrollY = window.scrollY;
  var docking = false;

  function stickLine() {
    return header ? header.offsetHeight : 0;
  }

  function clearSheet(sheet) {
    sheet.section.classList.remove("is-approaching");
    sheet.section.style.removeProperty("--pull");
    if (sheet.wrap && sheet.wrap.style.transform) sheet.wrap.style.transform = "";
  }

  function updateStretch() {
    if (reduceMotion) return;
    var stick = stickLine();
    var reach = Math.max(window.innerHeight - stick, 1);
    var nearest = null;
    var nearestGap = reach;
    for (var i = 0; i < sheets.length; i++) {
      clearSheet(sheets[i]);
      var gap = sheets[i].section.getBoundingClientRect().top - stick;
      if (gap > 0 && gap < nearestGap) {
        nearest = sheets[i];
        nearestGap = gap;
      }
    }
    if (!nearest) return;
    var along = 1 - nearestGap / reach;
    var pull = Math.sin(Math.max(0, Math.min(1, along)) * Math.PI) * 200;
    nearest.section.classList.add("is-approaching");
    nearest.section.style.setProperty("--pull", pull.toFixed(1) + "px");
    if (nearest.wrap) {
      var scale = 1 + (pull / 200) * 0.05;
      nearest.wrap.style.transform = "scaleY(" + scale.toFixed(4) + ")";
    }
  }

  function dockIfReady() {
    if (reduceMotion || docking || scrollDir < 0) return;
    if (document.body.classList.contains("modal-open") || document.body.classList.contains("nav-open")) return;
    var stick = stickLine();
    var critical = Math.min(200, window.innerHeight * 0.24);
    var gap = 0;
    var found = false;
    for (var i = 0; i < sheets.length; i++) {
      var section = sheets[i].section;
      var pull = parseFloat(section.style.getPropertyValue("--pull")) || 0;
      var next = section.getBoundingClientRect().top + pull - stick;
      if (next > 8 && next < critical && (!found || next < gap)) {
        gap = next;
        found = true;
      }
    }
    if (!found) return;
    docking = true;
    window.scrollTo({ top: window.scrollY + gap, behavior: "smooth" });
  }

  function updateNav() {
    var y = window.scrollY;
    if (Math.abs(y - lastScrollY) > 1) scrollDir = y > lastScrollY ? 1 : -1;
    lastScrollY = y;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    updateStretch();
    var mark = window.scrollY + 140;
    var id = "";
    sections.forEach(function (section) {
      if (section.offsetTop <= mark) id = section.id;
    });
    var active = null;
    sectionLinks.forEach(function (link) {
      var on = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-current", on);
      if (on) active = link;
    });
    placeIndicator(active);
  }

  updateNav();
  window.addEventListener("scroll", updateNav, { passive: true });
  window.addEventListener("resize", updateNav);
  if (wideNav.addEventListener) wideNav.addEventListener("change", updateNav);
  if (!reduceMotion && "onscrollend" in window) {
    window.addEventListener("scrollend", function () {
      if (docking) {
        docking = false;
        updateStretch();
        return;
      }
      dockIfReady();
    });
  }

  if (!reduceMotion) {
    var revealNodes = document.querySelectorAll(
      "main > section:not(.hero):not(#screens):not(#connect):not(#setup), #screens .screen, #screens > .wrap > .kicker, #screens > .wrap > h2, #screens > .wrap > .lede, #connect .path, #connect > .wrap > .kicker, #connect > .wrap > h2, #connect > .wrap > .lede, #setup .path, #setup > .wrap > .kicker, #setup > .wrap > h2, #setup > .wrap > .lede"
    );
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -48px 0px" });
    Array.prototype.forEach.call(revealNodes, function (node) {
      if (node.getBoundingClientRect().top < window.innerHeight * 0.92) {
        node.classList.add("is-in");
        return;
      }
      node.classList.add("reveal");
      revealObserver.observe(node);
    });
  }

  var modal = document.querySelector("[data-modal]");
  var form = document.querySelector("[data-walkthrough-form]");
  var error = document.querySelector("[data-form-error]");

  function setModal(open) {
    if (!modal) return;
    modal.classList.toggle("is-open", open);
    modal.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("modal-open", open);
    if (open) {
      var first = modal.querySelector("input");
      if (first) first.focus();
    }
  }

  document.querySelectorAll("[data-open-walkthrough]").forEach(function (button) {
    button.addEventListener("click", function () {
      setNav(false);
      setModal(true);
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach(function (button) {
    button.addEventListener("click", function () {
      setModal(false);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal && modal.classList.contains("is-open")) {
      setModal(false);
    }
  });

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (error) error.hidden = true;

      var data = new FormData(form);
      var name = String(data.get("name") || "").trim();
      var company = String(data.get("company") || "").trim();
      var email = String(data.get("email") || "").trim();
      var note = String(data.get("note") || "").trim();

      if (!name || !company || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (error) error.hidden = false;
        return;
      }

      var lines = [
        "Name: " + name,
        "Company: " + company,
        "Email: " + email,
        "",
        note || "Please set a first meeting about Cycle CRM."
      ];

      window.location.href =
        "mailto:info@cycletiger.com?subject=" +
        encodeURIComponent("Cycle CRM — first meeting — " + company) +
        "&body=" +
        encodeURIComponent(lines.join("\n"));
    });
  }
})();
