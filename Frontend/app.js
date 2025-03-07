document.addEventListener("DOMContentLoaded", function () {
    const taskInput = document.getElementById("taskInput");
    const addTaskBtn = document.getElementById("addTask");
    const taskList = document.getElementById("taskList");
  
    // Create and append Clear Completed button
    const clearCompletedBtn = document.createElement("button");
    clearCompletedBtn.textContent = "Clear Completed";
    clearCompletedBtn.id = "clearCompleted";
    clearCompletedBtn.style.marginTop = "10px";
    clearCompletedBtn.style.display = "none";
    document.querySelector(".container").appendChild(clearCompletedBtn);
  
    // Load tasks from localStorage
    loadTasks();
  
    // Add task on button click
    addTaskBtn.addEventListener("click", addTask);
  
    // Add task on Enter key
    taskInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        addTask();
      }
    });
  
    // Clear completed tasks
    clearCompletedBtn.addEventListener("click", function () {
      const completedTasks = document.querySelectorAll(".task-completed");
      completedTasks.forEach(taskSpan => {
        const li = taskSpan.closest("li");
        if (li) li.remove();
      });
      saveTasks();
      updateClearCompletedButton();
    });
  
    // Add a new task
    function addTask() {
      let taskText = taskInput.value.trim();
      if (!taskText) return;
  
      // Generate a unique task ID
      const taskId = "task-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  
      // Check for @HH:MM pattern
      let alarmTime = null;
      const timeMatch = taskText.match(/@(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])/);
      if (timeMatch) {
        alarmTime = timeMatch[0].substring(1); // Extract HH:MM
        taskText = taskText.replace(timeMatch[0], "").trim(); // Remove time from text
        scheduleAlarm(taskId, alarmTime, taskText);
      }
  
      createTaskElement(taskText, false, alarmTime, taskId);
      taskInput.value = "";
      saveTasks();
    }
  
    // Schedule an alarm via chrome.alarms
    function scheduleAlarm(taskId, time, taskText) {
      const [hour, minute] = time.split(":").map(Number);
      const now = new Date();
      const alarmDate = new Date();
      alarmDate.setHours(hour, minute, 0, 0);
  
      // If the time has already passed today, schedule for tomorrow
      if (alarmDate < now) {
        alarmDate.setDate(alarmDate.getDate() + 1);
      }
  
      const delayInMinutes = (alarmDate - now) / (1000 * 60);
      chrome.alarms.create(taskId, { delayInMinutes });
      console.log(`Alarm set for "${taskText}" at ${time}`);
    }
  
    // Create a task element and add it to the list
    function createTaskElement(text, completed = false, alarmTime = null, taskId = "") {
      const li = document.createElement("li");
      li.dataset.taskId = taskId; // Attach the unique task ID
  
      // Create task text span
      const taskSpan = document.createElement("span");
      taskSpan.textContent = text;
      taskSpan.className = "task-text";
      if (completed) {
        taskSpan.classList.add("task-completed");
      }
  
      // Create checkbox for completion
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-checkbox";
      checkbox.checked = completed;
      checkbox.addEventListener("change", function () {
        taskSpan.classList.toggle("task-completed", this.checked);
        saveTasks();
        updateClearCompletedButton();
      });
  
      // Add alarm display if needed (ensure it’s added only once)
      if (alarmTime && !text.includes(`⏰ ${alarmTime}`)) {
        const timeSpan = document.createElement("span");
        timeSpan.textContent = ` ⏰ ${alarmTime}`;
        timeSpan.classList.add("alarm-time");
        timeSpan.style.color = "red";
        timeSpan.style.fontSize = "0.9em";
        timeSpan.style.marginLeft = "5px";
        taskSpan.appendChild(timeSpan);
      }
  
      // Create delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "❌";
      deleteBtn.className = "delete-btn";
      deleteBtn.addEventListener("click", function () {
        li.remove();
        saveTasks();
        updateClearCompletedButton();
      });
  
      // Assemble the task item
      li.appendChild(checkbox);
      li.appendChild(taskSpan);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
  
      updateClearCompletedButton();
  
      // Add fade-in animation
      li.style.animation = "fadeIn 0.3s";
      return li;
    }
  
    // Save tasks to localStorage
    function saveTasks() {
        const tasks = [];
        document.querySelectorAll("#taskList li").forEach(li => {
          const checkbox = li.querySelector(".task-checkbox");
          const taskSpan = li.querySelector(".task-text");
          const alarmSpan = taskSpan.querySelector(".alarm-time");
          const baseText = taskSpan.childNodes[0].nodeValue.trim();
          const alarmTime = alarmSpan
            ? alarmSpan.textContent.replace("⏰", "").trim()
            : null;
          
          tasks.push({
            text: baseText,
            completed: checkbox.checked,
            alarmTime: alarmTime,
            taskId: li.dataset.taskId
          });
        });
        localStorage.setItem("carnereTasks", JSON.stringify(tasks));
        // Also save to chrome.storage.local
        chrome.storage.local.set({ tasks });
    }
      
  
    // Load tasks from localStorage
    function loadTasks() {
        chrome.storage.local.get("tasks", (result) => {
          const tasks = result.tasks || [];
          taskList.innerHTML = "";
          tasks.forEach(task => {
            createTaskElement(task.text, task.completed, task.alarmTime, task.taskId);
          });
        });
      }
  
    // Update visibility of the Clear Completed button
    function updateClearCompletedButton() {
      const hasCompletedTasks = document.querySelectorAll(".task-completed").length > 0;
      clearCompletedBtn.style.display = hasCompletedTasks ? "block" : "none";
    }
  
    // Listen for messages (e.g., completeTask notifications from background.js)
    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
      if (message.action === "completeTask") {
        // Use taskId to find the specific task element
        const taskItem = document.querySelector(`[data-task-id="${message.taskId}"]`);
        if (taskItem) {
          const checkbox = taskItem.querySelector(".task-checkbox");
          checkbox.checked = true;
          taskItem.querySelector(".task-text").classList.add("task-completed");
          saveTasks();
          updateClearCompletedButton();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "Task not found" });
        }
      }
      return true;
    });
  });
  