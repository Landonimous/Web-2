const STORAGE_KEY = 'landonimous';
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) { /* ignore */ }
  return [];
}
function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}
(function insertStyles() {
  const css = `
    :root { --bg:#f6f7fb; --card:#fff; --accent:#0b63d6; --muted:#6b7280; --danger:#d9534f; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, Arial, sans-serif; background:var(--bg); color:#111; padding:12px; }
    .container { max-width:980px; margin:0 auto; }
    header { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
    h1 { margin:0; font-size:20px; }
    h4 { margin:0; color:var(--accent); font-size:14px; }
    .panel { background:var(--card); padding:12px; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .form-row { display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
    input[type="text"], input[type="date"] { padding:8px; border:1px solid #e5e7eb; border-radius:6px; min-width:160px; }
    button { background:var(--accent); color:#fff; border:0; padding:8px 12px; border-radius:8px; cursor:pointer; }
    button.ghost { background:transparent; color:var(--accent); border:1px solid #e5e7eb; }
    .controls { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
    .list { margin-top:12px; display:flex; flex-direction:column; gap:8px; }
    .task { display:flex; align-items:center; gap:10px; padding:10px; background:var(--card); border-radius:8px; border:1px solid #eee; }
    .task.dragging { opacity:0.6; }
    .task .left { display:flex; align-items:center; gap:10px; flex:1; }
    .task .title { font-weight:600; }
    .task .meta { color:var(--muted); font-size:13px; margin-left:8px; }
    .task.done .title { text-decoration: line-through; color:var(--muted); }
    .task .actions { display:flex; gap:6px; }
    .task button.small { padding:6px 8px; font-size:13px; border-radius:6px; }
    .filter { display:flex; gap:6px; align-items:center; }
    .search { padding:6px 8px; border-radius:6px; border:1px solid #e5e7eb; }
    @media (max-width:640px) {
      header { flex-direction:column; align-items:flex-start; gap:8px; }
      .form-row { flex-direction:column; align-items:stretch; }
      input[type="text"], input[type="date"] { width:100%; }
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.type = 'text/css';
  styleEl.appendChild(document.createTextNode(css));
  document.head.appendChild(styleEl);
})();
const appContainer = document.createElement('div');
appContainer.className = 'container';
document.body.appendChild(appContainer);
const header = document.createElement('header');
const titleBlock = document.createElement('div');
const h1 = document.createElement('h1');
h1.textContent = 'To-Do лист';
const h4 = document.createElement('h4');
h4.textContent = 'Список задач';
titleBlock.appendChild(h1);
titleBlock.appendChild(h4);
header.appendChild(titleBlock);
appContainer.appendChild(header);
const mainPanel = document.createElement('div');
mainPanel.className = 'panel';
appContainer.appendChild(mainPanel);
const formRow = document.createElement('div');
formRow.className = 'form-row';
const titleInput = document.createElement('input');
titleInput.type = 'text';
titleInput.placeholder = 'Новая задача';
titleInput.setAttribute('aria-label', 'Заголовок задачи');
const dateInput = document.createElement('input');
dateInput.type = 'date';
dateInput.setAttribute('aria-label', 'Дата выполнения');
const addButton = document.createElement('button');
addButton.textContent = 'Добавить';
addButton.setAttribute('aria-label', 'Добавить задачу');
formRow.appendChild(titleInput);
formRow.appendChild(dateInput);
formRow.appendChild(addButton);
mainPanel.appendChild(formRow);
const controls = document.createElement('div');
controls.className = 'controls';
const searchInput = document.createElement('input');
searchInput.type = 'text';
searchInput.className = 'search';
searchInput.placeholder = 'Поиск';
const filterSelect = document.createElement('select');
filterSelect.className = 'filter';
['Все','Выполненные','Невыполненные'].forEach((label, idx) => {
  const opt = document.createElement('option');
  opt.value = String(idx);
  opt.textContent = label;
  filterSelect.appendChild(opt);
});
const sortButton = document.createElement('button');
sortButton.className = 'ghost';
sortButton.textContent = 'Сортировать по дате ↑';
sortButton.dataset.order = 'asc';
controls.appendChild(searchInput);
controls.appendChild(filterSelect);
controls.appendChild(sortButton);
mainPanel.appendChild(controls);
const listContainer = document.createElement('div');
listContainer.className = 'list';
mainPanel.appendChild(listContainer);
const info = document.createElement('p');
info.style.color = '#555';
info.style.fontSize = '13px';
mainPanel.appendChild(info);
let tasks = loadTasks();
if (tasks.length === 0) {
  tasks = [];
} else {
  tasks = tasks.map((t, i) => {
    if (!t.id) t.id = uid();
    if (typeof t.order === 'undefined') t.order = i;
    return t;
  });
}
function renderTasks() {
  while (listContainer.firstChild) listContainer.removeChild(listContainer.firstChild);
  const searchText = searchInput.value.trim().toLowerCase();
  const filterMode = Number(filterSelect.value);
  const order = sortButton.dataset.order;
  let visible = tasks.slice();
  if (filterMode === 1) visible = visible.filter(t => t.done === true);
  if (filterMode === 2) visible = visible.filter(t => t.done === false);
  if (searchText) visible = visible.filter(t => t.title.toLowerCase().includes(searchText));
  visible.sort((a, b) => {
    if (a.date && b.date) {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return order === 'asc' ? ta - tb : tb - ta;
    }
    if (a.date && !b.date) return order === 'asc' ? -1 : 1;
    if (!a.date && b.date) return order === 'asc' ? 1 : -1;
    return (a.order || 0) - (b.order || 0);
  });
  visible.forEach(task => {
    const taskEl = document.createElement('div');
    taskEl.className = 'task';
    taskEl.setAttribute('draggable', 'true');
    if (task.done) taskEl.classList.add('done');
    taskEl.dataset.id = task.id;
    const left = document.createElement('div');
    left.className = 'left';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!task.done;
    checkbox.setAttribute('aria-label','Отметить как выполненное');
    const titleWrap = document.createElement('div');
    const titleEl = document.createElement('div');
    titleEl.className = 'title';
    titleEl.textContent = task.title;
    const metaEl = document.createElement('div');
    metaEl.className = 'meta';
    metaEl.textContent = task.date ? formatDate(task.date) : 'без даты';
    titleWrap.appendChild(titleEl);
    titleWrap.appendChild(metaEl);
    left.appendChild(checkbox);
    left.appendChild(titleWrap);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'small';
    editBtn.textContent = 'Редактировать';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'small ghost';
    deleteBtn.textContent = 'Удалить';
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    taskEl.appendChild(left);
    taskEl.appendChild(actions);
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
      if (task.done) taskEl.classList.add('done'); else taskEl.classList.remove('done');
      saveTasks(tasks);
      updateOrdersFromDOM();
      renderTasks();
    });
    deleteBtn.addEventListener('click', () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks(tasks);
      renderTasks();
    });
    editBtn.addEventListener('click', () => {
      const titleInputEdit = document.createElement('input');
      titleInputEdit.type = 'text';
      titleInputEdit.value = task.title;
      const dateInputEdit = document.createElement('input');
      dateInputEdit.type = 'date';
      dateInputEdit.value = task.date || '';
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Сохранить';
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Отмена';
      cancelBtn.className = 'ghost';
      titleWrap.removeChild(titleEl);
      titleWrap.removeChild(metaEl);
      titleWrap.appendChild(titleInputEdit);
      titleWrap.appendChild(dateInputEdit);
      actions.innerHTML = '';
      while (actions.firstChild) actions.removeChild(actions.firstChild);
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      saveBtn.addEventListener('click', () => {
        const newTitle = titleInputEdit.value.trim();
        const newDate = dateInputEdit.value || '';
        if (!newTitle) {
          alert('Нет заголовка');
          return;
        }
        task.title = newTitle;
        task.date = newDate;
        saveTasks(tasks);
        renderTasks();
      });
      cancelBtn.addEventListener('click', () => {
        renderTasks();
      });
    });
    taskEl.addEventListener('dragstart', (e) => {
      taskEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
    });
    taskEl.addEventListener('dragend', () => {
      taskEl.classList.remove('dragging');
    });
    listContainer.appendChild(taskEl);
  });
  updateCounts();
}
function updateCounts() {
  saveTasks(tasks);
}
listContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  const afterElement = getDragAfterElement(listContainer, e.clientY);
  const dragging = document.querySelector('.task.dragging');
  if (!dragging) return;
  if (afterElement == null) {
    listContainer.appendChild(dragging);
  } else {
    listContainer.insertBefore(dragging, afterElement);
  }
});
listContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  updateOrdersFromDOM();
  saveTasks(tasks);
  renderTasks();
});
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
  let closest = null;
  let closestOffset = Number.NEGATIVE_INFINITY;
  draggableElements.forEach(el => {
    const box = el.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = el;
    }
  });
  return closest;
}
function updateOrdersFromDOM() {
  const domTasks = [...listContainer.querySelectorAll('.task')];
  domTasks.forEach((el, idx) => {
    const id = el.dataset.id;
    const t = tasks.find(x => x.id === id);
    if (t) t.order = idx;
  });
  saveTasks(tasks);
}
addButton.addEventListener('click', () => {
  const title = titleInput.value.trim();
  const date = dateInput.value || '';
  if (!title) {
    alert('Ошибка');
    return;
  }
  const newTask = {
    id: uid(),
    title: title,
    date: date,
    done: false,
    order: tasks.length
  };
  tasks.push(newTask);
  saveTasks(tasks);
  titleInput.value = '';
  dateInput.value = '';
  renderTasks();
});
titleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addButton.click();
});
sortButton.addEventListener('click', () => {
  const cur = sortButton.dataset.order;
  sortButton.dataset.order = cur === 'asc' ? 'desc' : 'asc';
  sortButton.textContent = `Сортировать по дате ${sortButton.dataset.order === 'asc' ? '↑' : '↓'}`;
  renderTasks();
});
filterSelect.addEventListener('change', renderTasks);
searchInput.addEventListener('input', renderTasks);
renderTasks();