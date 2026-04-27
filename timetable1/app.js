/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  SchedSolver — app.js                                            ║
 * ║  Author  : Yasir Shaikh                                          ║
 * ║  GitHub  : https://github.com/YasirShaikh03                     ║
 * ║  License : MIT                                                   ║
 * ║                                                                  ║
 * ║  Sections:                                                       ║
 * ║   1.  Theme Toggle                                               ║
 * ║   2.  Mode Management (class / exam)                             ║
 * ║   3.  Data Stores                                                ║
 * ║   4.  Initialisation                                             ║
 * ║   5.  Time Config Helpers (shared)                               ║
 * ║   6.  Subject Management (class mode)                            ║
 * ║   7.  Teacher Management (class mode)                            ║
 * ║   8.  Locked Slots (class mode)                                  ║
 * ║   9.  Exam Course Management                                     ║
 * ║   10. Exam Room Management                                       ║
 * ║   11. Exam Group Management                                      ║
 * ║   12. Constraint Checking — Class Mode                           ║
 * ║   13. Backtracking Solver — Class Mode                           ║
 * ║   14. Constraint Checking — Exam Mode                            ║
 * ║   15. Backtracking Solver — Exam Mode                            ║
 * ║   16. Generate Entry Points                                      ║
 * ║   17. Render Timetable — Class Mode                              ║
 * ║   18. Render Timetable — Exam Mode                               ║
 * ║   19. Step Visualisation                                         ║
 * ║   20. CSV Export                                                 ║
 * ║   21. Print                                                      ║
 * ║   22. Reset                                                      ║
 * ║   23. Status & Alert Helpers                                     ║
 * ║   24. Demo Data Loader                                           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   1. THEME TOGGLE
═══════════════════════════════════════════════════════════ */

const THEME_KEY = 'schedsolver_theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
  try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  let saved = 'dark';
  try { saved = localStorage.getItem(THEME_KEY) || 'dark'; } catch (_) {}
  applyTheme(saved);
}

/* ═══════════════════════════════════════════════════════════
   2. MODE MANAGEMENT
═══════════════════════════════════════════════════════════ */

let currentMode = 'class'; // 'class' | 'exam'

function switchMode(mode) {
  currentMode = mode;

  document.getElementById('tabClass').classList.toggle('active', mode === 'class');
  document.getElementById('tabExam').classList.toggle('active',  mode === 'exam');

  document.querySelectorAll('.class-only').forEach(el => {
    el.style.display = mode === 'class' ? '' : 'none';
  });
  document.querySelectorAll('.exam-only').forEach(el => {
    el.style.display = mode === 'exam' ? '' : 'none';
  });

  document.getElementById('mainTitle').textContent =
    mode === 'class' ? 'Class Timetable' : 'Exam Timetable';
  document.getElementById('mainSubtitle').textContent =
    mode === 'class' ? 'CSP + Backtracking solver' : 'Conflict-free exam scheduling solver';

  // Reset display area
  document.getElementById('mainActions').style.display   = 'none';
  document.getElementById('statsRow').style.display      = 'none';
  document.getElementById('legendRow').style.display     = 'none';
  document.getElementById('legendRow').innerHTML         = '';
  document.getElementById('conflictSummary').style.display = 'none';
  document.getElementById('alertBox').innerHTML          = '';
  document.getElementById('timetableArea').innerHTML     = emptyStateHTML();
  setStatus('', 'Configure and click Generate');
}

function emptyStateHTML() {
  return `<div class="empty-state">
    <div class="empty-icon">⊠</div>
    <div class="empty-title">No timetable yet</div>
    <div class="empty-sub">Add your data, then click <strong>Generate</strong>.</div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════
   3. DATA STORES
═══════════════════════════════════════════════════════════ */

/* — Class Mode — */
/** @type {{ name:string, lectures:number, color:string }[]} */
let subjects    = [];
/** @type {{ name:string, subjIndex:number, availDays:number[] }[]} */
let teachers    = [];
let breakSlots  = new Set();
/** @type {{ subjIndex:number, day:number, slot:number }[]} */
let lockedSlots = [];
let timetable   = [];

/* — Exam Mode — */
/** @type {{ name:string, students:number, color:string }[]} */
let examCourses  = [];
/** @type {{ name:string, capacity:number }[]} */
let examRooms    = [];
/**
 * Student groups — courses in same group conflict.
 * @type {{ name:string, courseIndices:number[] }[]}
 */
let examGroups   = [];
/** @type {{ courseIndex:number, day:number, slot:number }[]} */
let examLocked   = [];
/**
 * Final exam schedule.
 * assignments[courseIndex] = { day, slot, roomIdx } | null
 */
let examAssignments = [];

/* — Shared — */
let stats = { attempts: 0, placements: 0, solveTime: 0 };

const PALETTE = [
  '#7c6af7','#3ecf8e','#f55353','#f5a623','#5bc0eb',
  '#f47fff','#43d9c3','#ff6b6b','#a3b18a','#e76f51',
  '#c77dff','#06d6a0','#ef476f','#ffd166','#118ab2',
];

/* ═══════════════════════════════════════════════════════════
   4. INITIALISATION
═══════════════════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  refreshSlotGrid();
  refreshDayChecks();
  loadLockSelects();
  loadExamLockSelects();
});

/* ═══════════════════════════════════════════════════════════
   5. TIME CONFIG HELPERS (shared)
═══════════════════════════════════════════════════════════ */

const getNumSlots = () => parseInt(document.getElementById('numSlots').value, 10) || 6;
const getNumDays  = () => parseInt(document.getElementById('numDays').value,  10) || 5;

function getSlotNames() {
  const raw = document.getElementById('slotNames').value;
  const arr = raw.split(',').map(s => s.trim()).filter(Boolean);
  const n   = getNumSlots();
  while (arr.length < n) arr.push(`S${arr.length + 1}`);
  return arr.slice(0, n);
}

function getDayNames() {
  const raw = document.getElementById('dayNames').value;
  const arr = raw.split(',').map(s => s.trim()).filter(Boolean);
  const n   = getNumDays();
  const def = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  while (arr.length < n) arr.push(def[arr.length] || `Day${arr.length + 1}`);
  return arr.slice(0, n);
}

function refreshSlotGrid() {
  const n     = getNumSlots();
  const names = getSlotNames();
  const grid  = document.getElementById('breakSlotGrid');
  grid.innerHTML = '';

  for (let i = 0; i < n; i++) {
    const pill = document.createElement('span');
    pill.className = 'slot-pill' + (breakSlots.has(i) ? ' break' : '');
    pill.textContent = names[i] || `S${i + 1}`;
    pill.addEventListener('click', () => {
      if (breakSlots.has(i)) breakSlots.delete(i); else breakSlots.add(i);
      pill.classList.toggle('break');
    });
    grid.appendChild(pill);
  }
  refreshDayChecks();
  loadLockSelects();
  loadExamLockSelects();
}

function refreshDayChecks() {
  const days      = getDayNames();
  const container = document.getElementById('teacherDays');
  container.innerHTML = '';
  days.forEach((d, i) => {
    const inp = document.createElement('input');
    inp.type = 'checkbox'; inp.id = `dc_${i}`; inp.className = 'day-check';
    inp.value = i; inp.checked = true;
    const lbl = document.createElement('label');
    lbl.htmlFor = `dc_${i}`; lbl.className = 'day-label'; lbl.textContent = d;
    container.appendChild(inp);
    container.appendChild(lbl);
  });
}

/* ═══════════════════════════════════════════════════════════
   6. SUBJECT MANAGEMENT (class mode)
═══════════════════════════════════════════════════════════ */

function addSubject() {
  const name = document.getElementById('subjName').value.trim();
  const lec  = parseInt(document.getElementById('subjLec').value, 10);
  if (!name)      return alert('Enter a subject name.');
  if (!lec || lec < 1) return alert('Lecture count must be ≥ 1.');
  subjects.push({ name, lectures: lec, color: PALETTE[subjects.length % PALETTE.length] });
  document.getElementById('subjName').value = '';
  renderSubjectList();
  updateTeacherSubjSelect();
  loadLockSelects();
}

function removeSubject(i) {
  subjects.splice(i, 1);
  teachers    = teachers.filter(t => t.subjIndex !== i)
                        .map(t => ({ ...t, subjIndex: t.subjIndex > i ? t.subjIndex - 1 : t.subjIndex }));
  lockedSlots = lockedSlots.filter(l => l.subjIndex !== i)
                           .map(l => ({ ...l, subjIndex: l.subjIndex > i ? l.subjIndex - 1 : l.subjIndex }));
  renderSubjectList(); renderTeacherList(); renderLockList();
  updateTeacherSubjSelect(); loadLockSelects();
}

function renderSubjectList() {
  const list = document.getElementById('subjList');
  list.innerHTML = '';
  subjects.forEach((s, i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML =
      `<span class="dot" style="background:${s.color}"></span>` +
      `${s.name} ×${s.lectures}` +
      `<button class="tag-remove" onclick="removeSubject(${i})">×</button>`;
    list.appendChild(tag);
  });
}

function updateTeacherSubjSelect() {
  const sel = document.getElementById('teacherSubj');
  sel.innerHTML = '<option value="">-- select --</option>';
  subjects.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = s.name;
    sel.appendChild(opt);
  });
}

/* ═══════════════════════════════════════════════════════════
   7. TEACHER MANAGEMENT (class mode)
═══════════════════════════════════════════════════════════ */

function addTeacher() {
  const name      = document.getElementById('teacherName').value.trim();
  const subjIndex = parseInt(document.getElementById('teacherSubj').value, 10);
  if (!name)           return alert('Enter teacher name.');
  if (isNaN(subjIndex)) return alert('Select a subject.');
  const availDays = [];
  document.querySelectorAll('#teacherDays .day-check:checked')
          .forEach(cb => availDays.push(parseInt(cb.value, 10)));
  if (!availDays.length) return alert('Select at least one available day.');
  teachers.push({ name, subjIndex, availDays });
  document.getElementById('teacherName').value = '';
  renderTeacherList();
}

function removeTeacher(i) {
  teachers.splice(i, 1);
  renderTeacherList();
}

function renderTeacherList() {
  const list     = document.getElementById('teacherList');
  const dayNames = getDayNames();
  list.innerHTML = '';
  teachers.forEach((t, i) => {
    const subj = subjects[t.subjIndex];
    const days = t.availDays.map(d => dayNames[d]).join(', ');
    const tag  = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML =
      `${t.name} → ${subj ? subj.name : '?'} <span class="hint">(${days})</span>` +
      `<button class="tag-remove" onclick="removeTeacher(${i})">×</button>`;
    list.appendChild(tag);
  });
}

/* ═══════════════════════════════════════════════════════════
   8. LOCKED SLOTS (class mode)
═══════════════════════════════════════════════════════════ */

function loadLockSelects() {
  const sd = document.getElementById('lockSubj');
  const dd = document.getElementById('lockDay');
  const sl = document.getElementById('lockSlot');
  if (!sd) return;
  sd.innerHTML = ''; dd.innerHTML = ''; sl.innerHTML = '';
  subjects.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = s.name; sd.appendChild(o);
  });
  getDayNames().forEach((d, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = d; dd.appendChild(o);
  });
  getSlotNames().forEach((s, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = s; sl.appendChild(o);
  });
}

function addLock() {
  if (!subjects.length) return alert('Add subjects first.');
  const subjIndex = parseInt(document.getElementById('lockSubj').value, 10);
  const day       = parseInt(document.getElementById('lockDay').value,  10);
  const slot      = parseInt(document.getElementById('lockSlot').value, 10);
  if (breakSlots.has(slot)) return alert('That slot is a break — cannot lock here.');
  if (lockedSlots.some(l => l.day === day && l.slot === slot))
    return alert('That day/slot is already locked.');
  lockedSlots.push({ subjIndex, day, slot });
  renderLockList();
}

function removeLock(i) { lockedSlots.splice(i, 1); renderLockList(); }

function renderLockList() {
  const list      = document.getElementById('lockList');
  const days      = getDayNames();
  const slotNames = getSlotNames();
  list.innerHTML  = '';
  lockedSlots.forEach((l, i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML =
      `🔒 ${subjects[l.subjIndex] ? subjects[l.subjIndex].name : '?'} @ ${days[l.day]} ${slotNames[l.slot]}` +
      `<button class="tag-remove" onclick="removeLock(${i})">×</button>`;
    list.appendChild(tag);
  });
}

/* ═══════════════════════════════════════════════════════════
   9. EXAM COURSE MANAGEMENT
═══════════════════════════════════════════════════════════ */

function addExamCourse() {
  const name     = document.getElementById('examCourseName').value.trim();
  const students = parseInt(document.getElementById('examCourseStudents').value, 10);
  if (!name)         return alert('Enter a course name.');
  if (!students || students < 1) return alert('Student count must be ≥ 1.');
  examCourses.push({ name, students, color: PALETTE[examCourses.length % PALETTE.length] });
  document.getElementById('examCourseName').value = '';
  renderExamCourseList();
  updateExamGroupCourseSelect();
  loadExamLockSelects();
}

function removeExamCourse(i) {
  examCourses.splice(i, 1);
  // Fix group references
  examGroups = examGroups.map(g => ({
    ...g,
    courseIndices: g.courseIndices
      .filter(ci => ci !== i)
      .map(ci => ci > i ? ci - 1 : ci)
  })).filter(g => g.courseIndices.length > 0);

  examLocked = examLocked.filter(l => l.courseIndex !== i)
    .map(l => ({ ...l, courseIndex: l.courseIndex > i ? l.courseIndex - 1 : l.courseIndex }));

  renderExamCourseList();
  renderExamGroupList();
  renderExamLockList();
  updateExamGroupCourseSelect();
  loadExamLockSelects();
}

function renderExamCourseList() {
  const list = document.getElementById('examCourseList');
  list.innerHTML = '';
  examCourses.forEach((c, i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML =
      `<span class="dot" style="background:${c.color}"></span>` +
      `${c.name} (${c.students} students)` +
      `<button class="tag-remove" onclick="removeExamCourse(${i})">×</button>`;
    list.appendChild(tag);
  });
}

/* ═══════════════════════════════════════════════════════════
   10. EXAM ROOM MANAGEMENT
═══════════════════════════════════════════════════════════ */

function addExamRoom() {
  const name     = document.getElementById('examRoomName').value.trim();
  const capacity = parseInt(document.getElementById('examRoomCap').value, 10);
  if (!name)         return alert('Enter a room name.');
  if (!capacity || capacity < 1) return alert('Capacity must be ≥ 1.');
  examRooms.push({ name, capacity });
  document.getElementById('examRoomName').value = '';
  renderExamRoomList();
}

function removeExamRoom(i) {
  examRooms.splice(i, 1);
  renderExamRoomList();
}

function renderExamRoomList() {
  const list = document.getElementById('examRoomList');
  list.innerHTML = '';
  examRooms.forEach((r, i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML =
      `🏛 ${r.name} — cap. ${r.capacity}` +
      `<button class="tag-remove" onclick="removeExamRoom(${i})">×</button>`;
    list.appendChild(tag);
  });
}

/* ═══════════════════════════════════════════════════════════
   11. EXAM GROUP MANAGEMENT
═══════════════════════════════════════════════════════════ */

// Temporary in-progress group
let pendingGroup = { name: '', courseIndices: [] };

function updateExamGroupCourseSelect() {
  const sel = document.getElementById('examGroupCourse');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- select --</option>';
  examCourses.forEach((c, i) => {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

function addExamGroup() {
  const name   = document.getElementById('examGroupName').value.trim();
  const rawCi  = document.getElementById('examGroupCourse').value;
  const ci     = parseInt(rawCi, 10);

  if (!name)       return alert('Enter a group name.');
  if (isNaN(ci))   return alert('Select a course to add.');

  // Check if group with this name exists — if so, add course to it
  let group = examGroups.find(g => g.name === name);
  if (!group) {
    group = { name, courseIndices: [] };
    examGroups.push(group);
  }
  if (!group.courseIndices.includes(ci)) {
    group.courseIndices.push(ci);
  } else {
    showAlert('warn', `Course "${examCourses[ci].name}" is already in group "${name}".`);
  }

  document.getElementById('examGroupCourse').value = '';
  renderExamGroupList();
}

function removeExamGroup(i) {
  examGroups.splice(i, 1);
  renderExamGroupList();
}

function removeCourseFromGroup(groupIdx, courseIdx) {
  examGroups[groupIdx].courseIndices = examGroups[groupIdx].courseIndices.filter(ci => ci !== courseIdx);
  if (examGroups[groupIdx].courseIndices.length === 0) examGroups.splice(groupIdx, 1);
  renderExamGroupList();
}

function renderExamGroupList() {
  const list = document.getElementById('examGroupList');
  list.innerHTML = '';
  examGroups.forEach((g, gi) => {
    const tag = document.createElement('span');
    tag.className = 'tag group-tag';

    const header = document.createElement('div');
    header.className = 'group-tag-header';
    header.innerHTML =
      `<span>👥 ${g.name}</span>` +
      `<button class="tag-remove" onclick="removeExamGroup(${gi})">×</button>`;

    const pills = document.createElement('div');
    pills.className = 'group-courses';
    g.courseIndices.forEach(ci => {
      const c = examCourses[ci];
      if (!c) return;
      const pill = document.createElement('span');
      pill.className = 'group-course-pill';
      pill.title = 'Click to remove from group';
      pill.textContent = c.name;
      pill.addEventListener('click', () => removeCourseFromGroup(gi, ci));
      pills.appendChild(pill);
    });

    tag.appendChild(header);
    tag.appendChild(pills);
    list.appendChild(tag);
  });
}

/* Locked Exams */
function loadExamLockSelects() {
  const cd = document.getElementById('examLockCourse');
  const dd = document.getElementById('examLockDay');
  const sd = document.getElementById('examLockSlot');
  if (!cd) return;
  cd.innerHTML = ''; dd.innerHTML = ''; sd.innerHTML = '';
  examCourses.forEach((c, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = c.name; cd.appendChild(o);
  });
  getDayNames().forEach((d, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = d; dd.appendChild(o);
  });
  getSlotNames().forEach((s, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = s; sd.appendChild(o);
  });
}

function addExamLock() {
  if (!examCourses.length) return alert('Add exam courses first.');
  const courseIndex = parseInt(document.getElementById('examLockCourse').value, 10);
  const day         = parseInt(document.getElementById('examLockDay').value,    10);
  const slot        = parseInt(document.getElementById('examLockSlot').value,   10);
  if (breakSlots.has(slot)) return alert('That slot is a break.');
  if (examLocked.some(l => l.courseIndex === courseIndex))
    return alert('This course already has a locked slot.');
  examLocked.push({ courseIndex, day, slot });
  renderExamLockList();
}

function removeExamLock(i) { examLocked.splice(i, 1); renderExamLockList(); }

function renderExamLockList() {
  const list      = document.getElementById('examLockList');
  const days      = getDayNames();
  const slotNames = getSlotNames();
  list.innerHTML  = '';
  examLocked.forEach((l, i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML =
      `🔒 ${examCourses[l.courseIndex] ? examCourses[l.courseIndex].name : '?'} @ ${days[l.day]} ${slotNames[l.slot]}` +
      `<button class="tag-remove" onclick="removeExamLock(${i})">×</button>`;
    list.appendChild(tag);
  });
}

/* ═══════════════════════════════════════════════════════════
   12. CONSTRAINT CHECKING — CLASS MODE
═══════════════════════════════════════════════════════════ */

/**
 * Returns true if placing subjIdx at (day, slot) is valid.
 * Rules: slot free, lectures remaining, teacher available & not double-booked.
 */
function canPlace(day, slot, subjIdx, grid, rem, teacherBySubj, teacherDayUsed) {
  if (grid[day][slot] !== null) return false;
  if (rem[subjIdx] <= 0) return false;
  const t = teacherBySubj[subjIdx];
  if (t) {
    if (!t.availDays.includes(day)) return false;
    if (teacherDayUsed[t.index].has(day)) return false;
  }
  return true;
}

/* ═══════════════════════════════════════════════════════════
   13. BACKTRACKING SOLVER — CLASS MODE
═══════════════════════════════════════════════════════════ */

function backtrack(slotIdx, freeSlots, grid, rem, subjectOrder, teacherBySubj, teacherDayUsed, statsRef) {
  // Forward-checking pruning
  const slotsLeft = freeSlots.length - slotIdx;
  const lecLeft   = rem.reduce((a, b) => a + b, 0);
  if (lecLeft > slotsLeft) return false;
  if (slotIdx === freeSlots.length) return rem.every(r => r === 0);

  const [day, sl] = freeSlots[slotIdx];

  for (const subjIdx of subjectOrder) {
    if (rem[subjIdx] <= 0) continue;
    if (!canPlace(day, sl, subjIdx, grid, rem, teacherBySubj, teacherDayUsed)) continue;

    grid[day][sl] = { type: 'subject', subjIndex: subjIdx };
    rem[subjIdx]--;
    statsRef.placements++;

    const t = teacherBySubj[subjIdx];
    if (t) teacherDayUsed[t.index].add(day);

    if (backtrack(slotIdx + 1, freeSlots, grid, rem, subjectOrder, teacherBySubj, teacherDayUsed, statsRef)) {
      return true;
    }

    // Undo
    grid[day][sl] = null;
    rem[subjIdx]++;
    statsRef.attempts++;
    if (t) {
      const lockedUsesDay = lockedSlots.some(l => l.subjIndex === subjIdx && l.day === day);
      if (!lockedUsesDay) teacherDayUsed[t.index].delete(day);
    }
  }

  return backtrack(slotIdx + 1, freeSlots, grid, rem, subjectOrder, teacherBySubj, teacherDayUsed, statsRef);
}

/* ═══════════════════════════════════════════════════════════
   14. CONSTRAINT CHECKING — EXAM MODE
═══════════════════════════════════════════════════════════ */

/**
 * Returns true if course `ci` can be placed at (day, slot).
 *
 * Rules:
 *  E1. Slot is not a break.
 *  E2. No group-conflict course is already at the same (day, slot).
 *  E3. Min-gap between exams of the same group is respected.
 *  E4. Max exams per day not exceeded.
 *  E5. If rooms are defined, at least one room has capacity >= students and is free at (day, slot).
 */
function canPlaceExam(ci, day, slot, assignments, roomUsage, minGap, maxPerDay, nDays) {
  if (breakSlots.has(slot)) return false;

  // Count exams already on this day
  let examsOnDay = 0;
  for (let k = 0; k < examCourses.length; k++) {
    if (assignments[k] && assignments[k].day === day) examsOnDay++;
  }
  if (examsOnDay >= maxPerDay) return false;

  // Conflict and gap checks
  for (const group of examGroups) {
    if (!group.courseIndices.includes(ci)) continue;
    for (const other of group.courseIndices) {
      if (other === ci) continue;
      const a = assignments[other];
      if (!a) continue;
      // Same slot conflict
      if (a.day === day && a.slot === slot) return false;
      // Min gap
      if (minGap > 0 && Math.abs(a.day - day) < minGap) return false;
    }
  }

  // Room check (only if rooms are defined)
  if (examRooms.length > 0) {
    const needed = examCourses[ci].students;
    const hasRoom = examRooms.some((r, ri) =>
      r.capacity >= needed && !roomUsage[`${day}-${slot}-${ri}`]
    );
    if (!hasRoom) return false;
  }

  return true;
}

/** Find the best room (smallest sufficient capacity) for a course at (day, slot). */
function findRoom(ci, day, slot, roomUsage) {
  if (!examRooms.length) return -1;
  const needed = examCourses[ci].students;
  let best = -1, bestCap = Infinity;
  examRooms.forEach((r, ri) => {
    if (r.capacity >= needed && !roomUsage[`${day}-${slot}-${ri}`] && r.capacity < bestCap) {
      best = ri; bestCap = r.capacity;
    }
  });
  return best;
}

/* ═══════════════════════════════════════════════════════════
   15. BACKTRACKING SOLVER — EXAM MODE
═══════════════════════════════════════════════════════════ */

/**
 * Recursive exam scheduler.
 * Each course in `courseOrder` gets assigned exactly one (day, slot, room).
 */
function backtrackExam(idx, courseOrder, assignments, roomUsage, minGap, maxPerDay, nDays, nSlots, statsRef) {
  if (idx === courseOrder.length) return true;

  const ci = courseOrder[idx];

  for (let d = 0; d < nDays; d++) {
    for (let s = 0; s < nSlots; s++) {
      if (!canPlaceExam(ci, d, s, assignments, roomUsage, minGap, maxPerDay, nDays)) continue;

      const ri = findRoom(ci, d, s, roomUsage);
      if (examRooms.length > 0 && ri === -1) continue;

      assignments[ci] = { day: d, slot: s, roomIdx: ri };
      if (ri >= 0) roomUsage[`${d}-${s}-${ri}`] = true;
      statsRef.placements++;

      if (backtrackExam(idx + 1, courseOrder, assignments, roomUsage, minGap, maxPerDay, nDays, nSlots, statsRef)) {
        return true;
      }

      assignments[ci] = null;
      if (ri >= 0) delete roomUsage[`${d}-${s}-${ri}`];
      statsRef.attempts++;
    }
  }

  return false;
}

/* ═══════════════════════════════════════════════════════════
   16. GENERATE ENTRY POINTS
═══════════════════════════════════════════════════════════ */

function generate() {
  if (currentMode === 'class') generateClass();
  else generateExam();
}

/* ── Class Mode ───────────────────────────────────────────── */
function generateClass() {
  setStatus('busy', 'Running backtracking algorithm…');
  showAlert('', '');

  if (!subjects.length) {
    setStatus('err', 'No subjects added');
    return showAlert('err', 'Add at least one subject before generating.');
  }

  const nDays  = getNumDays();
  const nSlots = getNumSlots();
  const totalAvailable = nDays * (nSlots - breakSlots.size);
  const totalLectures  = subjects.reduce((a, s) => a + s.lectures, 0);

  if (totalLectures > totalAvailable) {
    setStatus('err', 'Too many lectures');
    return showAlert('err', `Cannot fit ${totalLectures} lectures into ${totalAvailable} available slots.`);
  }

  for (const lock of lockedSlots) {
    if (lock.day >= nDays || lock.slot >= nSlots)
      return showAlert('err', 'A locked slot is out of range. Remove and re-add it.');
    if (breakSlots.has(lock.slot))
      return showAlert('err', 'A locked slot sits on a break. Remove it first.');
  }

  const lockMap = new Map();
  for (const l of lockedSlots) {
    const key = `${l.day}-${l.slot}`;
    if (lockMap.has(key)) return showAlert('err', 'Two locked slots conflict at the same position.');
    lockMap.set(key, l);
  }

  const teacherBySubj = {};
  teachers.forEach((t, ti) => { teacherBySubj[t.subjIndex] = { ...t, index: ti }; });

  const grid = Array.from({ length: nDays }, () => Array(nSlots).fill(null));
  for (let d = 0; d < nDays; d++)
    for (let s = 0; s < nSlots; s++)
      if (breakSlots.has(s)) grid[d][s] = { type: 'break' };

  const rem = subjects.map(s => s.lectures);
  for (const lock of lockedSlots) {
    grid[lock.day][lock.slot] = { type: 'subject', subjIndex: lock.subjIndex, locked: true };
    rem[lock.subjIndex]--;
    if (rem[lock.subjIndex] < 0)
      return showAlert('err', `"${subjects[lock.subjIndex].name}" has more locked slots than its lecture count.`);
  }

  const freeSlots = [];
  for (let d = 0; d < nDays; d++)
    for (let s = 0; s < nSlots; s++)
      if (grid[d][s] === null) freeSlots.push([d, s]);

  const subjectOrder = subjects
    .map((s, i) => ({ i, lec: rem[i] }))
    .filter(x => x.lec > 0)
    .sort((a, b) => b.lec - a.lec)
    .map(x => x.i);

  const teacherDayUsed = teachers.map(() => new Set());
  for (const lock of lockedSlots) {
    const t = teacherBySubj[lock.subjIndex];
    if (t) teacherDayUsed[t.index].add(lock.day);
  }

  const statsRef = { attempts: 0, placements: 0 };
  const t0 = performance.now();
  const solved = backtrack(0, freeSlots, grid, rem, subjectOrder, teacherBySubj, teacherDayUsed, statsRef);
  const t1 = performance.now();

  stats = { attempts: statsRef.attempts, placements: statsRef.placements, solveTime: Math.round(t1 - t0) };

  if (!solved) {
    setStatus('err', 'No valid timetable found');
    showAlert('err', 'No valid timetable with current constraints. Try relaxing teacher restrictions or adding more slots.');
    document.getElementById('statsRow').style.display = '';
    updateStats(0, nDays * nSlots);
    return;
  }

  timetable = grid;
  const filled = grid.flat().filter(c => c && c.type === 'subject').length;
  setStatus('ok', `Generated in ${stats.solveTime}ms`);
  showAlert('ok', `Timetable generated! ${filled} slots filled · ${stats.attempts.toLocaleString()} backtracks.`);
  updateStats(filled, nDays * nSlots);
  renderClassTimetable(grid, nDays, nSlots);
  document.getElementById('mainActions').style.display = '';
  document.getElementById('statsRow').style.display    = '';
  document.getElementById('statConflictsWrap').style.display = 'none';
}

/* ── Exam Mode ────────────────────────────────────────────── */
function generateExam() {
  setStatus('busy', 'Scheduling exams…');
  showAlert('', '');
  document.getElementById('conflictSummary').style.display = 'none';

  if (!examCourses.length) {
    setStatus('err', 'No courses');
    return showAlert('err', 'Add at least one exam course first.');
  }

  const nDays      = getNumDays();
  const nSlots     = getNumSlots();
  const minGap     = parseInt(document.getElementById('examMinGap').value,     10) || 0;
  const maxPerDay  = parseInt(document.getElementById('examMaxPerDay').value,  10) || 99;
  const totalExams = examCourses.length;
  const totalFreeSlots = nDays * (nSlots - breakSlots.size);

  if (totalExams > totalFreeSlots)
    return showAlert('err', `Cannot fit ${totalExams} exams into ${totalFreeSlots} available slots.`);

  // Validate locked exams
  for (const lock of examLocked) {
    if (lock.day >= nDays || lock.slot >= nSlots)
      return showAlert('err', 'A locked exam is out of range. Remove and re-add it.');
    if (breakSlots.has(lock.slot))
      return showAlert('err', 'A locked exam slot is a break. Remove it first.');
  }

  // Assignments array — null = unscheduled
  const assignments = new Array(examCourses.length).fill(null);
  const roomUsage   = {};

  // Pre-fill locked exams
  for (const lock of examLocked) {
    const ri = findRoom(lock.courseIndex, lock.day, lock.slot, roomUsage);
    if (examRooms.length > 0 && ri === -1)
      return showAlert('err', `No room available for locked exam "${examCourses[lock.courseIndex].name}". Check room capacities.`);
    assignments[lock.courseIndex] = { day: lock.day, slot: lock.slot, roomIdx: ri, locked: true };
    if (ri >= 0) roomUsage[`${lock.day}-${lock.slot}-${ri}`] = true;
  }

  // Course order: most constrained (most group memberships) first
  const courseOrder = examCourses
    .map((c, i) => {
      const groupCount = examGroups.filter(g => g.courseIndices.includes(i)).length;
      return { i, groupCount, students: c.students };
    })
    .filter(x => assignments[x.i] === null) // skip already locked
    .sort((a, b) => b.groupCount - a.groupCount || b.students - a.students)
    .map(x => x.i);

  const statsRef = { attempts: 0, placements: 0 };
  const t0 = performance.now();
  const solved = backtrackExam(0, courseOrder, assignments, roomUsage, minGap, maxPerDay, nDays, nSlots, statsRef);
  const t1 = performance.now();

  stats = { attempts: statsRef.attempts, placements: statsRef.placements, solveTime: Math.round(t1 - t0) };

  if (!solved) {
    setStatus('err', 'No valid exam schedule found');
    showAlert('err',
      'Cannot schedule all exams without conflicts. Try: fewer min-gap days, more slots/days, or check group constraints.'
    );
    document.getElementById('statsRow').style.display = '';
    updateStats(0, nDays * nSlots);
    return;
  }

  examAssignments = assignments;

  const scheduled = assignments.filter(Boolean).length;
  setStatus('ok', `Scheduled in ${stats.solveTime}ms`);
  showAlert('ok', `Exam schedule generated! ${scheduled}/${examCourses.length} exams placed · ${stats.attempts.toLocaleString()} backtracks.`);
  updateStats(scheduled, totalFreeSlots);
  renderExamTimetable(assignments, nDays, nSlots);
  showConflictSummary(assignments);

  document.getElementById('mainActions').style.display    = '';
  document.getElementById('statsRow').style.display       = '';
  document.getElementById('statConflictsWrap').style.display = '';
}

/* ═══════════════════════════════════════════════════════════
   17. RENDER TIMETABLE — CLASS MODE
═══════════════════════════════════════════════════════════ */

function renderClassTimetable(grid, nDays, nSlots) {
  const dayNames  = getDayNames();
  const slotNames = getSlotNames();

  renderLegend(subjects, false);

  const area  = document.getElementById('timetableArea');
  area.innerHTML = '';
  const wrap  = document.createElement('div'); wrap.className = 'timetable-wrap';
  const table = buildTable(dayNames, slotNames);
  const tbody = document.createElement('tbody');

  for (let d = 0; d < nDays; d++) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.className = 'day-header'; th.textContent = dayNames[d];
    tr.appendChild(th);

    for (let s = 0; s < nSlots; s++) {
      const td   = document.createElement('td');
      const cell = grid[d][s];

      if (cell && cell.type === 'break') {
        td.className = 'cell break-cell';
        td.innerHTML = `<div class="cell-inner"><span class="break-label">BREAK</span></div>`;

      } else if (cell && cell.type === 'subject') {
        const subj  = subjects[cell.subjIndex];
        const color = subj ? subj.color : '#7c6af7';
        td.className = 'cell filled' + (cell.locked ? ' locked-cell' : '');
        const teacher = teachers.find(t => t.subjIndex === cell.subjIndex);
        td.innerHTML =
          `<div class="cell-inner" style="background:${color}22;border-left:3px solid ${color}">` +
          (cell.locked ? `<span class="lock-icon">🔒</span>` : '') +
          `<div class="subj-name" style="color:${color}">${subj ? subj.name : '?'}</div>` +
          (teacher ? `<div class="subj-teacher">${teacher.name}</div>` : '') +
          `</div>`;
      } else {
        td.className = 'cell empty';
        td.innerHTML = `<div class="cell-inner"></div>`;
      }

      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table); area.appendChild(wrap);
}

/* ═══════════════════════════════════════════════════════════
   18. RENDER TIMETABLE — EXAM MODE
═══════════════════════════════════════════════════════════ */

function renderExamTimetable(assignments, nDays, nSlots) {
  const dayNames  = getDayNames();
  const slotNames = getSlotNames();

  renderLegend(examCourses, true);

  // Build a grid: grid[day][slot] = array of course indices scheduled there
  const grid = Array.from({ length: nDays }, () =>
    Array.from({ length: nSlots }, () => [])
  );

  assignments.forEach((a, ci) => {
    if (a) grid[a.day][a.slot].push(ci);
  });

  const area  = document.getElementById('timetableArea');
  area.innerHTML = '';
  const wrap  = document.createElement('div'); wrap.className = 'timetable-wrap';
  const table = buildTable(dayNames, slotNames);
  const tbody = document.createElement('tbody');

  for (let d = 0; d < nDays; d++) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.className = 'day-header'; th.textContent = dayNames[d];
    tr.appendChild(th);

    for (let s = 0; s < nSlots; s++) {
      const td      = document.createElement('td');
      const courses = grid[d][s];

      if (breakSlots.has(s)) {
        td.className = 'cell break-cell';
        td.innerHTML = `<div class="cell-inner"><span class="break-label">BREAK</span></div>`;

      } else if (courses.length === 0) {
        td.className = 'cell empty';
        td.innerHTML = `<div class="cell-inner"></div>`;

      } else {
        td.className = courses.length > 1 ? 'cell filled multi-exam' : 'cell filled';
        const assignment = assignments[courses[0]];
        const isLocked   = assignment && assignment.locked;

        let inner = `<div class="cell-inner">`;
        courses.forEach(ci => {
          const course = examCourses[ci];
          const color  = course.color;
          const ri     = assignments[ci].roomIdx;
          const room   = ri >= 0 ? examRooms[ri] : null;
          inner +=
            `<div class="exam-entry" style="background:${color}22;border-left:3px solid ${color}">` +
            (isLocked && ci === courses[0] ? `<span class="lock-icon">🔒</span>` : '') +
            `<div class="subj-name" style="color:${color}">${course.name}</div>` +
            `<div class="subj-teacher">${course.students} students</div>` +
            (room ? `<div class="subj-room">🏛 ${room.name}</div>` : '') +
            `</div>`;
        });
        inner += `</div>`;
        td.innerHTML = inner;
        if (isLocked) td.classList.add('locked-cell');
      }

      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table); area.appendChild(wrap);
}

/** Show a conflict verification panel below the alert box */
function showConflictSummary(assignments) {
  const box = document.getElementById('conflictSummary');
  let conflicts = 0;

  for (const group of examGroups) {
    const scheduled = group.courseIndices
      .map(ci => ({ ci, a: assignments[ci] }))
      .filter(x => x.a);
    for (let i = 0; i < scheduled.length; i++) {
      for (let j = i + 1; j < scheduled.length; j++) {
        if (scheduled[i].a.day === scheduled[j].a.day && scheduled[i].a.slot === scheduled[j].a.slot) {
          conflicts++;
        }
      }
    }
  }

  document.getElementById('statConflicts').textContent = conflicts;
  document.getElementById('statConflicts').className   =
    'stat-val ' + (conflicts === 0 ? 'stat-green' : 'stat-red');

  box.style.display = '';
  box.innerHTML =
    `<div class="conflict-box ${conflicts > 0 ? 'has-conflicts' : ''}">` +
    (conflicts === 0
      ? '✓ No scheduling conflicts detected — all group constraints satisfied.'
      : `⚠ ${conflicts} conflict(s) found! Some exams in the same group are scheduled at the same time.`) +
    `</div>`;
}

/* ═══════════════════════════════════════════════════════════
   SHARED RENDER HELPERS
═══════════════════════════════════════════════════════════ */

function buildTable(dayNames, slotNames) {
  const table = document.createElement('table');
  table.className = 'timetable';
  const thead = document.createElement('thead');
  const hrow  = document.createElement('tr');
  const corner = document.createElement('th'); corner.textContent = '';
  hrow.appendChild(corner);
  slotNames.forEach(name => {
    const th = document.createElement('th'); th.textContent = name; hrow.appendChild(th);
  });
  thead.appendChild(hrow); table.appendChild(thead);
  return table;
}

function renderLegend(items, isExam) {
  const legend = document.getElementById('legendRow');
  legend.style.display = '';
  legend.innerHTML = '';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'legend-item';
    el.innerHTML =
      `<div class="legend-swatch" style="background:${item.color}22;border-color:${item.color}"></div>` +
      item.name + (isExam ? ` (${item.students})` : '');
    legend.appendChild(el);
  });
  if (breakSlots.size > 0) {
    const b = document.createElement('div');
    b.className = 'legend-item';
    b.innerHTML = `<div class="legend-swatch" style="background:var(--amber-dim);border-color:var(--amber)"></div>Break`;
    legend.appendChild(b);
  }
}

/* ═══════════════════════════════════════════════════════════
   19. STEP VISUALISATION
═══════════════════════════════════════════════════════════ */

let vizActive = false;

function stepViz() {
  if (vizActive) return;
  const cells = document.querySelectorAll('.cell.filled');
  if (!cells.length) return;
  vizActive = true;
  const btn = document.getElementById('vizBtn');
  btn.textContent = '⏸ Playing…';
  let i = 0;
  function next() {
    if (i >= cells.length) { vizActive = false; btn.textContent = '▶ Step Viz'; return; }
    cells[i].classList.add('filling');
    const idx = i;
    setTimeout(() => cells[idx].classList.remove('filling'), 360);
    i++;
    setTimeout(next, 130);
  }
  next();
}

/* ═══════════════════════════════════════════════════════════
   20. CSV EXPORT
═══════════════════════════════════════════════════════════ */

function exportCSV() {
  if (currentMode === 'class') exportClassCSV();
  else exportExamCSV();
}

function exportClassCSV() {
  if (!timetable.length) return;
  const dayNames  = getDayNames();
  const slotNames = getSlotNames();
  let csv = ',' + slotNames.join(',') + '\n';
  timetable.forEach((row, d) => {
    let line = dayNames[d];
    row.forEach(cell => {
      if (!cell)                     line += ',';
      else if (cell.type === 'break') line += ',BREAK';
      else line += ',' + (subjects[cell.subjIndex] ? subjects[cell.subjIndex].name : '');
    });
    csv += line + '\n';
  });
  downloadCSV(csv, 'class_timetable.csv');
}

function exportExamCSV() {
  if (!examAssignments.length) return;
  const dayNames  = getDayNames();
  const slotNames = getSlotNames();
  let csv = 'Course,Day,Slot,Students,Room\n';
  examAssignments.forEach((a, ci) => {
    if (!a) return;
    const course = examCourses[ci];
    const room   = a.roomIdx >= 0 ? examRooms[a.roomIdx].name : '';
    csv += `${course.name},${dayNames[a.day]},${slotNames[a.slot]},${course.students},${room}\n`;
  });
  downloadCSV(csv, 'exam_timetable.csv');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════
   21. PRINT
═══════════════════════════════════════════════════════════ */

function printTimetable() {
  window.print();
}

/* ═══════════════════════════════════════════════════════════
   22. RESET
═══════════════════════════════════════════════════════════ */

function reset() {
  if (currentMode === 'class') resetClass();
  else resetExam();
}

function resetClass() {
  subjects    = [];
  teachers    = [];
  breakSlots  = new Set();
  lockedSlots = [];
  timetable   = [];

  ['subjList','teacherList','lockList','alertBox'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  clearSharedDisplay();
  updateTeacherSubjSelect();
  loadLockSelects();
}

function resetExam() {
  examCourses     = [];
  examRooms       = [];
  examGroups      = [];
  examLocked      = [];
  examAssignments = [];

  ['examCourseList','examRoomList','examGroupList','examLockList','alertBox'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  clearSharedDisplay();
  updateExamGroupCourseSelect();
  loadExamLockSelects();
}

function clearSharedDisplay() {
  document.getElementById('legendRow').style.display    = 'none';
  document.getElementById('legendRow').innerHTML        = '';
  document.getElementById('statsRow').style.display     = 'none';
  document.getElementById('mainActions').style.display  = 'none';
  document.getElementById('conflictSummary').style.display = 'none';
  document.getElementById('numDays').value   = '5';
  document.getElementById('numSlots').value  = '6';
  document.getElementById('dayNames').value  = 'Mon,Tue,Wed,Thu,Fri';
  document.getElementById('slotNames').value = '8-9,9-10,10-11,11-12,12-13,13-14';
  document.getElementById('timetableArea').innerHTML = emptyStateHTML();
  setStatus('', 'Configure and click Generate');
  breakSlots = new Set();
  refreshSlotGrid();
}

/* ═══════════════════════════════════════════════════════════
   23. STATUS & ALERT HELPERS
═══════════════════════════════════════════════════════════ */

function setStatus(type, msg) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  dot.className = 'status-dot' + (type ? ' ' + type : '');
  txt.textContent = msg;
  txt.style.color = { ok: 'var(--green)', err: 'var(--red)', busy: 'var(--amber)' }[type] || 'var(--muted)';
}

function showAlert(type, msg) {
  const box = document.getElementById('alertBox');
  if (!msg) { box.innerHTML = ''; return; }
  const cls  = { ok:'alert-ok', err:'alert-err', info:'alert-info', warn:'alert-warn' }[type] || 'alert-info';
  const icon = { ok:'✓', err:'✕', info:'ℹ', warn:'⚠' }[type] || '·';
  box.innerHTML = `<div class="alert ${cls}"><span>${icon}</span><span>${msg}</span></div>`;
}

function updateStats(filled, total) {
  document.getElementById('statAttempts').textContent   = stats.attempts.toLocaleString();
  document.getElementById('statPlacements').textContent = stats.placements.toLocaleString();
  document.getElementById('statTime').textContent       = stats.solveTime + 'ms';
  document.getElementById('statTotal').textContent      = `${filled}/${total}`;
}

/* ═══════════════════════════════════════════════════════════
   24. DEMO DATA LOADER
═══════════════════════════════════════════════════════════ */

function loadDemo() {
  if (currentMode === 'class') loadClassDemo();
  else loadExamDemo();
}

/** Author: Yasir Shaikh — https://github.com/YasirShaikh03 */
function loadClassDemo() {
  resetClass();

  subjects = [
    { name: 'Math',      lectures: 4, color: '#7c6af7' },
    { name: 'Physics',   lectures: 3, color: '#3ecf8e' },
    { name: 'English',   lectures: 3, color: '#f5a623' },
    { name: 'Chemistry', lectures: 3, color: '#f55353' },
    { name: 'History',   lectures: 2, color: '#5bc0eb' },
    { name: 'PE',        lectures: 2, color: '#f47fff' },
  ];
  teachers = [
    { name: 'Dr. Mehta',  subjIndex: 0, availDays: [0,1,2,3,4] },
    { name: 'Prof. Roy',  subjIndex: 1, availDays: [0,2,4] },
    { name: 'Ms. Nair',   subjIndex: 2, availDays: [0,1,2,3,4] },
  ];
  breakSlots = new Set([3]);

  renderSubjectList(); renderTeacherList(); updateTeacherSubjSelect();
  refreshSlotGrid(); loadLockSelects();
  setStatus('', 'Demo loaded — click Generate');
  showAlert('info', 'Class demo loaded: 6 subjects · 3 teachers · slot 11–12 set as break.');
}

/** Author: Yasir Shaikh — https://github.com/YasirShaikh03 */
function loadExamDemo() {
  resetExam();

  document.getElementById('numDays').value   = '5';
  document.getElementById('numSlots').value  = '4';
  document.getElementById('slotNames').value = '9-11,11-13,14-16,16-18';
  document.getElementById('examMinGap').value    = '1';
  document.getElementById('examMaxPerDay').value = '3';
  breakSlots = new Set();
  refreshSlotGrid();

  examCourses = [
    { name: 'CS101',  students: 80,  color: '#7c6af7' },
    { name: 'MATH201',students: 60,  color: '#3ecf8e' },
    { name: 'PHY101', students: 55,  color: '#f55353' },
    { name: 'ENG101', students: 90,  color: '#f5a623' },
    { name: 'CHEM101',students: 45,  color: '#5bc0eb' },
    { name: 'DS301',  students: 35,  color: '#f47fff' },
    { name: 'STAT202',students: 50,  color: '#43d9c3' },
    { name: 'AI401',  students: 30,  color: '#a3b18a' },
  ];
  examRooms = [
    { name: 'Hall A', capacity: 100 },
    { name: 'Hall B', capacity: 60  },
    { name: 'Lab 1',  capacity: 40  },
  ];
  examGroups = [
    { name: 'Year 1 CS',  courseIndices: [0, 1, 2, 3] },
    { name: 'Year 1 Sci', courseIndices: [1, 2, 4] },
    { name: 'Year 3 CS',  courseIndices: [5, 6, 7] },
  ];

  renderExamCourseList(); renderExamRoomList(); renderExamGroupList();
  updateExamGroupCourseSelect(); loadExamLockSelects();
  setStatus('', 'Exam demo loaded — click Generate');
  showAlert('info', 'Exam demo loaded: 8 courses · 3 halls · 3 student groups · min 1-day gap.');
}
