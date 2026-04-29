# SchedSolver — Academic Timetable Generator

> **Author:** Yasir Shaikh &nbsp;|&nbsp; **GitHub:** [YasirShaikh03](https://github.com/YasirShaikh03) &nbsp;|&nbsp; **License:** MIT

A fully **client-side** academic timetable generator powered by **CSP (Constraint Satisfaction Problem) + Backtracking** algorithms.  
No backend. No frameworks. Pure HTML · CSS · JavaScript.

---

## ✨ Features

### 🗓 Class Timetable Mode
| Feature | Description |
|---|---|
| Subject Management | Add subjects with weekly lecture counts |
| Teacher Assignment | Assign teachers with day-availability constraints |
| Locked Slots | Pre-assign a subject to a specific day/slot |
| Break Slots | Mark slots as break periods (excluded from scheduling) |
| Backtracking Solver | CSP engine with forward-checking pruning |
| Step Visualisation | Replay the algorithm's fill order |
| CSV Export | Download the timetable as a `.csv` file |
| Print View | Clean print-optimised layout |

### 📋 Exam Timetable Mode
| Feature | Description |
|---|---|
| Exam Courses | Add courses with student enrollment counts |
| Room / Hall Management | Define rooms with capacity; auto-assigned by solver |
| Student Groups | Group courses that share students — no simultaneous exams |
| Min Gap Setting | Enforce minimum days between exams for the same group |
| Max Exams / Day | Limit how many exams are held on a single day |
| Locked Exams | Pre-schedule specific courses to fixed slots |
| Conflict Verification | Post-solve check that confirms zero group conflicts |
| CSV Export | Download exam schedule with room assignments |

### 🎨 Shared
- Dark / Light theme toggle (persisted to `localStorage`)
- Algorithm stats: backtracks, placements, solve time
- Responsive layout (mobile-friendly)
- Fully offline — no server or API required

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/YasirShaikh03/SchedSolver.git
cd SchedSolver

# Open in browser — no build step needed!
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

Or simply download the ZIP and open `index.html` directly.

---

## 📁 Project Structure

```
SchedSolver/
├── index.html        # Main HTML — sidebar + main panel
├── style.css         # All styles (dark/light themes, responsive, print)
├── app.js            # Full application logic (solver + UI)
├── README.md         # This file
├── LICENSE           # MIT License
├── .gitignore        # Git ignore rules
└── CONTRIBUTING.md   # Contribution guidelines
```

---

## 🧠 Algorithm

SchedSolver uses a **recursive backtracking CSP solver** with two specialised variants:

### Class Timetable Solver
1. Collects all free (non-break, non-locked) `(day, slot)` pairs.
2. Orders subjects by **most lectures first** (most-constrained variable heuristic).
3. For each free slot, tries each subject while checking:
   - Slot is currently empty.
   - Subject still needs more placements.
   - Assigned teacher is available that day and not double-booked.
4. If no subject fits, backtracks to the previous assignment.
5. **Forward-checking pruning**: aborts early if remaining lectures exceed remaining slots.

### Exam Timetable Solver
1. Orders courses by **most group memberships** (most-constrained first).
2. For each course, tries all `(day, slot)` combinations while checking:
   - Not a break slot.
   - No conflicting course (same student group) is at the same `(day, slot)`.
   - Minimum gap between exams for same group is satisfied.
   - Max exams per day not exceeded.
   - A room with sufficient capacity is available.
3. Room assignment uses a **best-fit** strategy (smallest sufficient room).
4. Backtracks if no valid placement exists.

---

## 📖 Usage Guide

### Class Mode

1. **Time Config** — set days, slot count, labels, and break slots.
2. **Subjects** — add each subject with its weekly lecture count.
3. **Teachers** *(optional)* — assign a teacher per subject and mark available days.
4. **Locked Slots** *(optional)* — pin a subject to a specific day/slot.
5. Click **Generate** — the solver runs and renders the timetable.
6. Use **Step Viz** to replay the fill order, **Export CSV** to download, or **Print** for a clean printout.

### Exam Mode

1. **Time Config** — set days and time slots (e.g., 4 slots × 5 days).
2. **Exam Courses** — add each course with student enrollment.
3. **Exam Rooms** *(optional)* — add halls/labs with capacities.
4. **Student Groups** — group courses whose students overlap. Courses in the same group cannot be scheduled simultaneously.
5. **Exam Settings** — set minimum gap (days) and max exams per day.
6. **Locked Exams** *(optional)* — pin specific exams.
7. Click **Generate** — solver schedules all exams conflict-free.
8. The **Conflict Summary** confirms that all group constraints are satisfied.

---

## 🖥 Browser Compatibility

| Browser | Support |
|---|---|
| Chrome / Edge 90+ | ✅ Full |
| Firefox 88+ | ✅ Full |
| Safari 14+ | ✅ Full |
| Mobile browsers | ✅ Responsive |

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

```bash
# Fork → Clone → Branch → Code → PR
git checkout -b feature/your-feature
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.  
Free to use, modify, and distribute with attribution.

---

## 👤 Author

**Yasir Shaikh**  
GitHub: [https://github.com/YasirShaikh03](https://github.com/YasirShaikh03)

---

## 🌟 Acknowledgements

- Algorithm inspired by classic CSP / backtracking literature.
- Fonts: [Syne](https://fonts.google.com/specimen/Syne) & [DM Mono](https://fonts.google.com/specimen/DM+Mono) via Google Fonts.

---

*Built with ❤️ by [Yasir Shaikh](https://github.com/YasirShaikh03)*
