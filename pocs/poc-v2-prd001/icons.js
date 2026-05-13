/* Lucide-style monochrome icons. SVG built via DOM (no innerHTML) so theme
 * tokens carry through `currentColor` and there is no XSS surface. No emoji
 * codepoints — those would render as platform bitmaps and ignore --destructive
 * / --success / theme switching.
 *
 * Icon definitions are arrays of [tag, attrs] pairs, all compile-time
 * constants — no user input ever enters this table. */
(function () {
  var SVG_NS = "http://www.w3.org/2000/svg";

  var ICONS = {
    "map-pin": [
      ["path", { d: "M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z" }],
      ["circle", { cx: "12", cy: "10", r: "3" }],
    ],
    "pencil": [
      ["path", { d: "M12 20h9" }],
      ["path", { d: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" }],
    ],
    "trash": [
      ["polyline", { points: "3 6 5 6 21 6" }],
      ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }],
    ],
    "plus": [
      ["line", { x1: "12", y1: "5", x2: "12", y2: "19" }],
      ["line", { x1: "5", y1: "12", x2: "19", y2: "12" }],
    ],
    "x": [
      ["line", { x1: "18", y1: "6", x2: "6", y2: "18" }],
      ["line", { x1: "6", y1: "6", x2: "18", y2: "18" }],
    ],
    "check": [
      ["polyline", { points: "20 6 9 17 4 12" }],
    ],
    "alert-circle": [
      ["circle", { cx: "12", cy: "12", r: "10" }],
      ["line", { x1: "12", y1: "8", x2: "12", y2: "12" }],
      ["line", { x1: "12", y1: "16", x2: "12.01", y2: "16" }],
    ],
    "alert-triangle": [
      ["path", { d: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }],
      ["line", { x1: "12", y1: "9", x2: "12", y2: "13" }],
      ["line", { x1: "12", y1: "17", x2: "12.01", y2: "17" }],
    ],
    "info": [
      ["circle", { cx: "12", cy: "12", r: "10" }],
      ["line", { x1: "12", y1: "16", x2: "12", y2: "12" }],
      ["line", { x1: "12", y1: "8", x2: "12.01", y2: "8" }],
    ],
    "filter": [
      ["polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }],
    ],
    "inbox": [
      ["polyline", { points: "22 12 16 12 14 15 10 15 8 12 2 12" }],
      ["path", { d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" }],
    ],
    "route-off": [
      ["circle", { cx: "6", cy: "19", r: "3" }],
      ["path", { d: "M9 19h8.5a3.5 3.5 0 0 0 0-7h-1" }],
      ["path", { d: "M15 5h1.5a3.5 3.5 0 0 1 1.69 6.56" }],
      ["circle", { cx: "18", cy: "5", r: "3" }],
      ["line", { x1: "3", y1: "3", x2: "21", y2: "21" }],
    ],
    "grip-vertical": [
      ["circle", { cx: "9", cy: "6", r: "1" }],
      ["circle", { cx: "9", cy: "12", r: "1" }],
      ["circle", { cx: "9", cy: "18", r: "1" }],
      ["circle", { cx: "15", cy: "6", r: "1" }],
      ["circle", { cx: "15", cy: "12", r: "1" }],
      ["circle", { cx: "15", cy: "18", r: "1" }],
    ],
    "chevron-right": [
      ["polyline", { points: "9 18 15 12 9 6" }],
    ],
    "chevron-down": [
      ["polyline", { points: "6 9 12 15 18 9" }],
    ],
    "arrow-right": [
      ["line", { x1: "5", y1: "12", x2: "19", y2: "12" }],
      ["polyline", { points: "12 5 19 12 12 19" }],
    ],
    "search": [
      ["circle", { cx: "11", cy: "11", r: "8" }],
      ["line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }],
    ],
    "upload": [
      ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
      ["polyline", { points: "17 8 12 3 7 8" }],
      ["line", { x1: "12", y1: "3", x2: "12", y2: "15" }],
    ],
    "download": [
      ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
      ["polyline", { points: "7 10 12 15 17 10" }],
      ["line", { x1: "12", y1: "15", x2: "12", y2: "3" }],
    ],
    "refresh": [
      ["polyline", { points: "23 4 23 10 17 10" }],
      ["polyline", { points: "1 20 1 14 7 14" }],
      ["path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10" }],
      ["path", { d: "M20.49 15A9 9 0 0 1 5.64 18.36L1 14" }],
    ],
    "external": [
      ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }],
      ["polyline", { points: "15 3 21 3 21 9" }],
      ["line", { x1: "10", y1: "14", x2: "21", y2: "3" }],
    ],
    "save": [
      ["path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }],
      ["polyline", { points: "17 21 17 13 7 13 7 21" }],
      ["polyline", { points: "7 3 7 8 15 8" }],
    ],
    "copy": [
      ["rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }],
      ["path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }],
    ],
    "list": [
      ["line", { x1: "8", y1: "6", x2: "21", y2: "6" }],
      ["line", { x1: "8", y1: "12", x2: "21", y2: "12" }],
      ["line", { x1: "8", y1: "18", x2: "21", y2: "18" }],
      ["line", { x1: "3", y1: "6", x2: "3.01", y2: "6" }],
      ["line", { x1: "3", y1: "12", x2: "3.01", y2: "12" }],
      ["line", { x1: "3", y1: "18", x2: "3.01", y2: "18" }],
    ],
    "globe": [
      ["circle", { cx: "12", cy: "12", r: "10" }],
      ["line", { x1: "2", y1: "12", x2: "22", y2: "12" }],
      ["path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" }],
    ],
    "layout": [
      ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }],
      ["line", { x1: "3", y1: "9", x2: "21", y2: "9" }],
      ["line", { x1: "9", y1: "21", x2: "9", y2: "9" }],
    ],
    "panel-left": [
      ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }],
      ["line", { x1: "9", y1: "3", x2: "9", y2: "21" }],
    ],
    "loader": [
      ["line", { x1: "12", y1: "2", x2: "12", y2: "6" }],
      ["line", { x1: "12", y1: "18", x2: "12", y2: "22" }],
      ["line", { x1: "4.93", y1: "4.93", x2: "7.76", y2: "7.76" }],
      ["line", { x1: "16.24", y1: "16.24", x2: "19.07", y2: "19.07" }],
      ["line", { x1: "2", y1: "12", x2: "6", y2: "12" }],
      ["line", { x1: "18", y1: "12", x2: "22", y2: "12" }],
      ["line", { x1: "4.93", y1: "19.07", x2: "7.76", y2: "16.24" }],
      ["line", { x1: "16.24", y1: "7.76", x2: "19.07", y2: "4.93" }],
    ],
  };

  function makeSvg(parts, size) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("xmlns", SVG_NS);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.75");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    for (var i = 0; i < parts.length; i++) {
      var tag = parts[i][0];
      var attrs = parts[i][1];
      var node = document.createElementNS(SVG_NS, tag);
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          node.setAttribute(k, attrs[k]);
        }
      }
      svg.appendChild(node);
    }
    return svg;
  }

  function render() {
    var hosts = document.querySelectorAll("[data-icon]");
    for (var i = 0; i < hosts.length; i++) {
      var el = hosts[i];
      var name = el.getAttribute("data-icon");
      var parts = ICONS[name];
      if (!parts) continue;
      if (el.querySelector("svg")) continue;
      var size = el.getAttribute("data-size") || "1em";
      el.appendChild(makeSvg(parts, size));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
