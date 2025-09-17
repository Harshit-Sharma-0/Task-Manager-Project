// --- Utilities ---
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : 'No due';
const todayISO = () => new Date().toISOString().slice(0,10);
const key = 'tasks-v1';
const priorityWeight = { high: 3, medium: 2, low: 1 };
// --- State ---
let tasks = JSON.parse(localStorage.getItem(key) || '[]');
let activeTab = 'all';
// --- DOM refs ---
const listEl = $('#task-list');
const emptyEl = $('#empty');
const form = $('#task-form');
const titleEl = $('#title');
const descEl = $('#description');
const priorityEl = $('#priority');
const dueEl = $('#due');
const idEl = $('#task-id');
const searchEl = $('#search');
const filterPriorityEl = $('#filter-priority');
const sortEl = $('#sort-by');
const tabsEl = $('#tabs');
const progressBar = $('#progress-bar');
const progressLabel = $('#progress-label');
const donut = $('#donut');
const statTotal = $('#stat-total');
const statDone = $('#stat-done');
const statActive = $('#stat-active');
const statOverdue = $('#stat-overdue');
const clock = $('#clock');
// --- Clock ---
setInterval(() => {
const now = new Date();
clock.textContent = now.toLocaleString();
}, 1000);
// --- Persistence ---
function save() {
localStorage.setItem(key, JSON.stringify(tasks));
}
// --- CRUD ---
function addTask(data) {
const t = {
id: crypto.randomUUID(),
title: data.title.trim(),
description: (data.description || '').trim(),
priority: data.priority || 'medium',
due: data.due || '',
completed: false,
createdAt: Date.now()
};
tasks.unshift(t);
save();
}
function updateTask(id, updates) {
const i = tasks.findIndex(t => t.id === id);
if (i !== -1) {
tasks[i] = { ...tasks[i], ...updates };
save();
}
}
function deleteTask(id) {
tasks = tasks.filter(t => t.id !== id);
save();
}
// --- Filters / Search / Sort ---
function getFilteredTasks() {
const q = searchEl.value.trim().toLowerCase();
const p = filterPriorityEl.value;
const today = todayISO();
let filtered = tasks.filter(t => {
const matchesQ =
!q ||
t.title.toLowerCase().includes(q) ||
t.description.toLowerCase().includes(q);
const matchesP = (p === 'all') || (t.priority === p);
let matchesTab = true;
if (activeTab === 'active') matchesTab = !t.completed;
if (activeTab === 'completed') matchesTab = t.completed;
if (activeTab === 'overdue') {
const overdue = t.due && !t.completed && t.due < today;
matchesTab = overdue;
}
return matchesQ && matchesP && matchesTab;
});
const [field, dir] = sortEl.value.split('-'); // e.g., 'created-desc'
filtered.sort((a, b) => {
if (field === 'created') {
return dir === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
}
if (field === 'due') {
const av = a.due || '9999-12-31';
const bv = b.due || '9999-12-31';
return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
}
if (field === 'priority') {
const av = priorityWeight[a.priority];
const bv = priorityWeight[b.priority];
return dir === 'asc' ? av - bv : bv - av;
}
return 0;
});
return filtered;
}
// --- Render ---
function render() {
const items = getFilteredTasks();
listEl.innerHTML = '';
emptyEl.hidden = tasks.length !== 0;
if (items.length === 0 && tasks.length) {
const el = document.createElement('div');
el.className = 'empty';
el.textContent = 'No tasks match your filters.';
listEl.appendChild(el);
}

const tpl = $('#task-item');
items.forEach(t => {
const node = tpl.content.firstElementChild.cloneNode(true);
const chkWrap = node.querySelector('.checkbox');
const chk = node.querySelector('input[type="checkbox"]');
const title = node.querySelector('.item-title');
const pr = node.querySelector('.pr');
const due = node.querySelector('.due');
const created = node.querySelector('.created');
const desc = node.querySelector('.desc');
const btnEdit = node.querySelector('.edit');
const btnDel = node.querySelector('.delete');
title.textContent = t.title;
desc.textContent = t.description || '';
pr.textContent = t.priority.toUpperCase();
pr.classList.add(t.priority);
due.textContent = t.due ? `Due: ${fmtDate(t.due)}` : 'No due date';
created.textContent = `Added: ${new Date(t.createdAt).toLocaleString()}`;
chk.checked = t.completed;
chkWrap.classList.toggle('checked', t.completed);
node.classList.toggle('completed', t.completed);
const isOverdue = t.due && !t.completed && t.due < todayISO();
if (isOverdue) due.classList.add('overdue');
chk.addEventListener('change', () => {
updateTask(t.id, { completed: chk.checked });
render();
});
chkWrap.addEventListener('click', (e) => {
if (e.target.tagName !== 'INPUT') {
chk.checked = !chk.checked;
chk.dispatchEvent(new Event('change'));
}
});
btnEdit.addEventListener('click', () => {
// Load into form
idEl.value = t.id;
titleEl.value = t.title;
descEl.value = t.description || '';
priorityEl.value = t.priority;
dueEl.value = t.due || '';
titleEl.focus();
});

btnDel.addEventListener('click', () => {
if (confirm('Delete this task?')) {
deleteTask(t.id);
render();
}

});
listEl.appendChild(node);
});
renderStats();
}
function renderStats() {
const total = tasks.length;
const done = tasks.filter(t => t.completed).length;
const active = tasks.filter(t => !t.completed).length;
const overdue = tasks.filter(t => t.due && !t.completed && t.due < todayISO()).length;
statTotal.textContent = total;
statDone.textContent = done;
statActive.textContent = active;
statOverdue.textContent = overdue;
const pct = total ? Math.round((done / total) * 100) : 0;
progressBar.style.width = pct + '%';
progressLabel.textContent = `${pct}% complete`;
donut.style.setProperty('--p', pct);
donut.setAttribute('data-label', pct);
}
// --- Events ---
form.addEventListener('submit', (e) => {
e.preventDefault();
const data = {
title: titleEl.value,
description: descEl.value,
priority: priorityEl.value,
due: dueEl.value
};
if (!data.title.trim()) {
alert('Title is required');
return;
}
const existingId = idEl.value;
if (existingId) {
updateTask(existingId, data);
} else {
addTask(data);
}
// reset form
idEl.value = '';
form.reset();
priorityEl.value = 'medium';
render();
});
searchEl.addEventListener('input', render);
filterPriorityEl.addEventListener('change', render);
sortEl.addEventListener('change', render);
tabsEl.addEventListener('click', (e) => {
const btn = e.target.closest('.tab');
if (!btn) return;
$$('.tab', tabsEl).forEach(t => t.classList.remove('active'));
btn.classList.add('active');
activeTab = btn.dataset.tab;
render();
});
// --- Initial ---
render();