document.addEventListener("DOMContentLoaded", () => {
    // Hole alle Hauptnavi-Einträge 
    document.querySelectorAll('.MainNav--list--item').forEach(li => {
      const a = li.querySelector('a.MainNav--link');
      if (!a) return;
      const href = a.getAttribute('href');
      const pathname = window.location.pathname;

      // Aktiver Bereich, wenn die aktuelle URL mit dem href beginnt (und nicht nur "/")
      if (href !== "/" && pathname.startsWith(href)) {
        li.classList.add('is-active');
      } else if (href === "/" && pathname === "/") {
        // Home-Seite explizit behandeln
        li.classList.add('is-active');
      } else {
        li.classList.remove('is-active');
      }
    });
});