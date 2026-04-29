# Contributing to SchedSolver

> Author: Yasir Shaikh — [https://github.com/YasirShaikh03](https://github.com/YasirShaikh03)

Thank you for your interest in contributing! SchedSolver is a fully client-side project — no build tooling required.

---

## 🛠 Development Setup

```bash
git clone https://github.com/YasirShaikh03/SchedSolver.git
cd SchedSolver
# Open index.html in your browser — no server needed
```

For a local dev server with live reload you can optionally use:
```bash
npx live-server .
```

---

## 📋 How to Contribute

1. **Fork** the repository on GitHub.
2. **Create a branch**: `git checkout -b feature/my-feature` or `fix/bug-name`.
3. **Make your changes** — keep the code in the same style (no frameworks, no build step).
4. **Test** your changes in at least one modern browser.
5. **Commit**: `git commit -m "feat: add XYZ"` (use [Conventional Commits](https://www.conventionalcommits.org)).
6. **Push** and open a **Pull Request** against `main`.

---

## 🐛 Reporting Bugs

Please open an issue and include:
- Browser + version
- Steps to reproduce
- Expected vs actual behaviour
- Screenshot if relevant

---

## 💡 Feature Ideas

Good areas for contribution:
- Multi-class / multi-section support
- Drag-and-drop manual override after generation
- Additional solver heuristics (arc consistency, AC-3)
- iCal / ICS export
- Localisation / i18n

---

## 📐 Code Style

- **No frameworks** — keep it vanilla HTML/CSS/JS.
- Use `'use strict'`.
- Section comments with `/* ═══ SECTION TITLE ═══ */`.
- Always include the author header in new files:
  ```
  // Author: Yasir Shaikh | https://github.com/YasirShaikh03
  ```
- Keep functions short and single-purpose.

---

## 📄 License

By contributing you agree that your contributions are licensed under the **MIT License**.

---

*SchedSolver by [Yasir Shaikh](https://github.com/YasirShaikh03)*
