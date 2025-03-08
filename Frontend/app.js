document.addEventListener("DOMContentLoaded", () => {
  const taskInput = document.getElementById("taskInput");
  const addTaskBtn = document.getElementById("addTask");
  const taskList = document.getElementById("taskList");

  // "Clear Completed" button
  const clearCompletedBtn = document.createElement("button");
  clearCompletedBtn.textContent = "Clear Completed";
  clearCompletedBtn.id = "clearCompleted";
  clearCompletedBtn.style.marginTop = "10px";
  clearCompletedBtn.style.display = "none";
  document.querySelector(".container").appendChild(clearCompletedBtn);

  // Date picker
  const datePickerBtn = document.getElementById("datePickerBtn");
  const datePicker = document.getElementById("datePicker");
  datePickerBtn.addEventListener("click", () => datePicker.showPicker());

  datePicker.addEventListener("change", () => console.log("Selected date:", datePicker.value));
  datePicker.addEventListener("change", () => {
    taskInput.focus();
  });
  const today = new Date().toISOString().split("T")[0];
  datePicker.setAttribute("min", today);

  loadTasks(); // Load saved tasks on startup

  addTaskBtn.addEventListener("click", addTask);
  taskInput.addEventListener("keypress", e => {
    if (e.key === "Enter") addTask();
  });

  clearCompletedBtn.addEventListener("click", () => {
    const completedTasks = document.querySelectorAll(".task-completed");
    completedTasks.forEach(taskSpan => {
      const li = taskSpan.closest("li");
      if (li) li.remove();
    });
    saveTasks();
    updateClearCompletedButton();
  });

  function addTask() {
    let taskText = taskInput.value.trim();
    if (!taskText) return;
    if (taskText.length > 50) {
      alert("Tasks Cannot Exceed 50 Characters.");
      return;
    }

    // assign ID
    const taskId = "task-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    let deadlineDate = datePicker.value || new Date().toISOString().split("T")[0];

    // Check for @HH:MM to set an alarm
    let alarmTime = null;
    const timeMatch = taskText.match(/@(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])/);
    if (timeMatch) {
      alarmTime = timeMatch[0].substring(1);
      taskText = taskText.replace(timeMatch[0], "").trim();
      scheduleAlarm(taskId, alarmTime, taskText, deadlineDate);
    }

    // Extract priority
    let taskPriority = "!";
    if (taskText.startsWith("!!!")) {
      taskPriority = "!!!";
      taskText = taskText.slice(3).trim();
    } else if (taskText.startsWith("!!")) {
      taskPriority = "!!";
      taskText = taskText.slice(2).trim();
    } else if (taskText.startsWith("!")) {
      taskPriority = "!";
      taskText = taskText.slice(1).trim();
    }

    createTaskElement(taskText, false, alarmTime, taskId, taskPriority, deadlineDate);
    taskInput.value = "";
    datePicker.value = "";
    saveTasks();
  }

  function scheduleAlarm(taskId, time, taskText, deadline) {
    const [hour, minute] = time.split(":").map(Number);
    const now = new Date();
    const alarmDate = new Date();
    alarmDate.setHours(hour, minute, 0, 0);

    if (alarmDate < now) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }
    const delayInMinutes = (alarmDate - now) / (1000 * 60);
    chrome.alarms.create(taskId, { delayInMinutes });
    console.log(`Alarm set for "${taskText}" at ${time}`);
  }

  function createTaskElement(text, completed = false, alarmTime = null, taskId = "", priority = "!", deadline = null) {
    const li = document.createElement("li");
    li.dataset.taskId = taskId;
    li.dataset.deadline = deadline || "";
    li.dataset.alarmTime = alarmTime || "";

    const taskSpan = document.createElement("span");
    taskSpan.textContent = text;
    taskSpan.className = "task-text";
    if (completed) taskSpan.classList.add("task-completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = completed;
    checkbox.addEventListener("change", () => {
      taskSpan.classList.toggle("task-completed", checkbox.checked);
      saveTasks();
      updateClearCompletedButton();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", () => {
      li.remove();
      saveTasks();
      updateClearCompletedButton();
    });

    const prioritySpan = document.createElement("span");
    prioritySpan.textContent = priority + " ";
    prioritySpan.classList.add("priority-label");
    if (priority === "!!!") {
      prioritySpan.style.color = "red";
      prioritySpan.style.fontWeight = "bold";
    } else if (priority === "!!") {
      prioritySpan.style.color = "orange";
      prioritySpan.style.fontWeight = "bold";
    } else {
      prioritySpan.style.color = "gray";
    }

    const today = new Date().toISOString().split("T")[0];
    const showDate = deadline && deadline !== today && deadline !== "null";
    const showTime = alarmTime && alarmTime !== "";

    if (showDate || showTime) {
      const dateTimeSpan = document.createElement("span");
      dateTimeSpan.classList.add("deadline-time");
      dateTimeSpan.style.color = "gray";
      dateTimeSpan.style.fontSize = "0.9em";
      dateTimeSpan.style.marginLeft = "5px";

      let dateTimeString = "";
      if (showDate) dateTimeString += `🗓️ ${deadline}`;
      if (showTime) {
        if (dateTimeString) {
          dateTimeString += ` ⏰${alarmTime}`;
        } else {
          dateTimeString += `⏰ ${alarmTime}`;
        }
      }
      dateTimeSpan.textContent = dateTimeString;
      taskSpan.appendChild(dateTimeSpan);
    }

    li.appendChild(checkbox);
    li.appendChild(prioritySpan);
    li.appendChild(taskSpan);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
    updateClearCompletedButton();
    li.style.animation = "fadeIn 0.3s";
    return li;
  }

  function saveTasks() {
    const tasks = [];
    document.querySelectorAll("#taskList li").forEach(li => {
      const checkbox = li.querySelector(".task-checkbox");
      const taskSpan = li.querySelector(".task-text");
      const prioritySpan = li.querySelector(".priority-label");
      const deadline = li.dataset.deadline || "";
      const alarmTime = li.dataset.alarmTime || "";
      const priority = prioritySpan ? prioritySpan.textContent.trim() : "!";
      const baseText = taskSpan.childNodes[0].nodeValue.trim();

      tasks.push({
        text: baseText,
        completed: checkbox.checked,
        priority: priority,
        taskId: li.dataset.taskId,
        deadline: deadline,
        alarmTime: alarmTime
      });
    });

    tasks.sort((a, b) => {
      const priorityOrder = { "!!!": 3, "!!": 2, "!": 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    chrome.storage.local.set({ tasks }, () => {
      console.log("Tasks saved to chrome.storage.local", tasks);
      displaySortedTasks(tasks);
    });
  }

  function displaySortedTasks(sortedTasks) {
    taskList.innerHTML = "";
    sortedTasks.forEach(task => {
      createTaskElement(
        task.text,
        task.completed,
        task.alarmTime,
        task.taskId,
        task.priority,
        task.deadline
      );
    });
  }

  function loadTasks() {
    chrome.storage.local.get("tasks", result => {
      let tasks = result.tasks || [];
      tasks.sort((a, b) => {
        const priorityOrder = { "!!!": 3, "!!": 2, "!": 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      taskList.innerHTML = "";
      tasks.forEach(task => {
        createTaskElement(
          task.text,
          task.completed,
          task.alarmTime,
          task.taskId,
          task.priority,
          task.deadline
        );
      });
    });
  }

  function updateClearCompletedButton() {
    const hasCompletedTasks = document.querySelectorAll(".task-completed").length > 0;
    clearCompletedBtn.style.display = hasCompletedTasks ? "block" : "none";
  }

  chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    if (message.action === "completeTask") {
      const taskItem = document.querySelector(`[data-task-id="${message.taskId}"]`);
      if (taskItem) {
        const checkbox = taskItem.querySelector(".task-checkbox");
        checkbox.checked = true;
        taskItem.querySelector(".task-text").classList.add("task-completed");
        saveTasks();
        updateClearCompletedButton();
        sendResponse({ success: true });
      } else {
        console.log("Task not found for ID:", message.taskId);
        sendResponse({ success: false, error: "Task not found" });
      }
    }
    return true;
  });
});
