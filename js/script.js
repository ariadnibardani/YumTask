//////////////////////////////////////////////////
// GLOBAL DATA (shared across all pages)

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let activity = JSON.parse(localStorage.getItem("activity")) || [];
let chart;

function saveData() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  localStorage.setItem("activity", JSON.stringify(activity));
}

//////////////////////////////////////////////////
// DOMContentLoaded INIT


document.addEventListener("DOMContentLoaded", function () {

  //////////////////////////////////////////////////
  // DARK MODE

  const toggleBtn = document.getElementById("darkToggle");
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem(
        "theme",
        document.body.classList.contains("dark-mode") ? "dark" : "light"
      );
    });
  }
 

  //////////////////////////////////////////////////
  // SET FOOTER YEAR

  const yearSpans = document.querySelectorAll(".year");
  yearSpans.forEach(span => {
    span.textContent = new Date().getFullYear();
  });

  //////////////////////////////////////////////////
  // PREVENT PAST DATES

  const dateInput = document.getElementById("task-date");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
  }

  //////////////////////////////////////////////////
  // TASK FORM

  const taskForm = document.getElementById("task-form");

  if (taskForm) {
    taskForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const nameEl = document.getElementById("task-name");
      const descEl = document.getElementById("task-desc");
      const dateEl = document.getElementById("task-date");
      const priorityEl = document.getElementById("task-priority");

      const name = nameEl.value.trim();
      const desc = descEl.value.trim();
      const date = dateEl.value;
      const priority = priorityEl.value;

      //////////////////////////////////////////////////
      // VALIDATION

      if (name.length === 0 || desc.length === 0) {
        alert("Please fill all fields.");
        return;
      }

      if (name.length > 50) {
        alert("Task name must be under 50 characters.");
        return;
      }

      if (desc.length > 100) {
        alert("Description must be under 100 characters.");
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      if (date < today) {
        alert("You cannot select a past date.");
        return;
      }

      //////////////////////////////////////////////////
      // CREATE NEW TASK

      const newTask = {
        id: Date.now(),
        name: name,
        desc: desc,
        date: date,
        priority: priority,
        completed: false
      };

      tasks.push(newTask);
      activity.push(`Task "${newTask.name}" added`);

      saveData();
      renderTasks();
      updateSummary();
      renderActivity();
      renderChart();
      updateAnalyticsStats();

      taskForm.reset();
    });
  }

  //////////////////////////////////////////////////
  // INITIAL RENDER

  if (document.getElementById("task-table")) renderTasks();
  if (document.getElementById("activity-list")) renderActivity();

  if (document.getElementById("taskChart")) {
    renderChart();
    updateAnalyticsStats();
  }

  if (document.getElementById("quote")) fetchQuote();

  //////////////////////////////////////////////////
  // FILTERS

  const filterStatus = document.getElementById("filter-status");
  const filterPriority = document.getElementById("filter-priority");
  const sortTasks = document.getElementById("sort-tasks");

  if (filterStatus) filterStatus.addEventListener("change", renderTasks);
  if (filterPriority) filterPriority.addEventListener("change", renderTasks);
  if (sortTasks) sortTasks.addEventListener("change", renderTasks);

});

//////////////////////////////////////////////////
// RENDER TASKS

function renderTasks() {
  const tableBody = document.querySelector("#task-table tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  let filtered = [...tasks];

  // ---------- FILTER BY STATUS ----------
  const statusFilter = document.getElementById("filter-status")?.value || "all";
  if (statusFilter === "completed") filtered = filtered.filter(t => t.completed);
  else if (statusFilter === "pending") filtered = filtered.filter(t => !t.completed);

  // ---------- FILTER BY PRIORITY ----------
  const priorityFilter = document.getElementById("filter-priority")?.value || "all";
  if (priorityFilter !== "all") filtered = filtered.filter(t => t.priority === priorityFilter);

  // ---------- SORT ----------
  const sortBy = document.getElementById("sort-tasks")?.value || "none";
  if (sortBy === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === "date") filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

  filtered.forEach(task => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${task.name}</td>
      <td>${task.desc}</td>
      <td>${task.date}</td>
      <td>${task.priority}</td>
      <td>${task.completed ? "Completed" : "Pending"}</td>
      <td>
        <button class="btn btn-success btn-sm complete-btn">${task.completed ? "↺" : "✔"}</button>
        <button class="btn btn-primary btn-sm edit-btn">✎</button>
        <button class="btn btn-danger btn-sm delete-btn">🗑</button>
      </td>
    `;

    // ---------- COMPLETE ----------
    row.querySelector(".complete-btn").addEventListener("click", () => {
      task.completed = !task.completed;
      activity.push(`Task "${task.name}" marked ${task.completed ? "completed" : "pending"}`);
      saveData();
      renderTasks();
      updateSummary();
      renderActivity();
      renderChart();
      updateAnalyticsStats();
    });

    // ---------- EDIT NAME ----------
    row.querySelector(".edit-btn").addEventListener("click", () => {
      const newName = prompt("Edit Task Name:", task.name);
      if (newName && newName.trim() !== "") {
        activity.push(`Task "${task.name}" renamed to "${newName}"`);
        task.name = newName.trim();
        saveData();
        renderTasks();
        renderActivity();
        renderChart();
        updateAnalyticsStats();
      }
    });

    // ---------- DELETE ----------
    row.querySelector(".delete-btn").addEventListener("click", () => {
      tasks = tasks.filter(t => t.id !== task.id);
      activity.push(`Task "${task.name}" deleted`);
      saveData();
      renderTasks();
      updateSummary();
      renderActivity();
      renderChart();
      updateAnalyticsStats();
    });

    tableBody.appendChild(row);
  });
}

//////////////////////////////////////////////////
// TASK SUMMARY

function updateSummary() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  const totalEl = document.getElementById("total-tasks");
  const completedEl = document.getElementById("completed-tasks");
  const pendingEl = document.getElementById("pending-tasks");

  if (totalEl) totalEl.textContent = total;
  if (completedEl) completedEl.textContent = completed;
  if (pendingEl) pendingEl.textContent = pending;
}

//////////////////////////////////////////////////
// LATEST ACTIVITY

function renderActivity() {
  const activityList = document.getElementById("activity-list");
  if (!activityList) return;

  activityList.innerHTML = "";

  const recent = activity.slice(-5).reverse();
  if (recent.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No recent activity yet.";
    activityList.appendChild(li);
  } else {
    recent.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      activityList.appendChild(li);
    });
  }
}

//////////////////////////////////////////////////
// ANALYTICS CHART

function renderChart() {
  const canvas = document.getElementById("taskChart");
  if (!canvas) return;

  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.length - completed;

  if (chart) chart.destroy();

  if (window.location.pathname.includes("tasks.html")) {

    chart = new Chart(canvas, {
      type: "pie",
      data: {
        labels: ["Completed", "Pending"],
        datasets: [{
          data: [completed, pending],
          backgroundColor: ["#2f9e44", "#e03131"]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });

  } else {
    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: ["Completed", "Pending"],
        datasets: [{
          data: [completed, pending],
          backgroundColor: ["#2f9e44", "#e03131"],
          borderRadius: 10,
          barThickness: 40
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } }
      }
    });
  }
}

//////////////////////////////////////////////////
// ANALYTICS STATS

function updateAnalyticsStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const highPriority = tasks.filter(t => t.priority === "High").length;
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const totalEl = document.getElementById("analytics-total");
  const rateEl = document.getElementById("analytics-rate");
  const highEl = document.getElementById("analytics-high");
  const progressFill = document.getElementById("progressFill");

  if (totalEl) totalEl.textContent = total;
  if (rateEl) rateEl.textContent = rate + "%";
  if (highEl) highEl.textContent = highPriority;
  if (progressFill) progressFill.style.width = rate + "%";
}

//////////////////////////////////////////////////
// DAILY FOOD FACT API

function fetchQuote() {
  const quoteEl = document.getElementById("quote");
  if (!quoteEl) return;

  const foodFacts = [
    "Honey never spoils.",
    "Carrots were originally purple.",
    "Tomatoes are technically berries.",
    "Cheese is the most stolen food in the world.",
    "Potatoes were the first vegetable grown in space.",
    "Peanuts are legumes, not nuts.",
    "Bananas are berries, but strawberries aren't."
  ];

  const randomFact = foodFacts[Math.floor(Math.random() * foodFacts.length)];
  quoteEl.textContent = randomFact;
}
