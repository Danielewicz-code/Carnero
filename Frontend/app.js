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

      if (taskText.length > 85) {
        alert("Tasks Cannot Exceed 85 Characters.");
        return;
      }
  
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

      // extract priority
      let taskPriority = "!";
      if (taskText.startsWith("!!!")) {
        taskPriority = "!!!"
        taskText = taskText.slice(3).trim()
      } else if (taskText.startsWith("!!")) {
        taskPriority = "!!"
        taskText = taskText.slice(2).trim()
      } else if (taskText.startsWith("!")) {
        taskPriority = "!"
        taskText = taskText.slice(1).trim()
      } else {
        console.log('No priority provided, default "!"')
      }

      console.log(`task added with priority: ${taskPriority}, for task ${taskText}`)

      createTaskElement(taskText, false, alarmTime, taskId, taskPriority);
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
    function createTaskElement(text, completed = false, alarmTime = null, taskId = "", priority = "!") {
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

      // Create priority display
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


      // Assemble the task item
      li.appendChild(checkbox);
      li.appendChild(prioritySpan);
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
          const prioritySpan = li.querySelector(".priority-label");
          
          const priority = prioritySpan ? prioritySpan.textContent.trim() : "!";
          const baseText = taskSpan.childNodes[0].nodeValue.trim();
          const alarmTime = alarmSpan
            ? alarmSpan.textContent.replace("⏰", "").trim()
            : null;
          
          tasks.push({
            text: baseText,
            completed: checkbox.checked,
            alarmTime: alarmTime,
            priority: priority,
            taskId: li.dataset.taskId
          });
        });

        // sort by priority inmmediately for the ui
        tasks.sort((a, b) => {
          const priorityOrder = {"!!!": 3, "!!": 2, "!": 1}
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        // Also save to chrome.storage.local
        chrome.storage.local.set({ tasks }, () => {
          console.log("Tasks successfully saved to chrome.storage.local", tasks);

          displaySortedTasks(tasks);
        });
    }


    function displaySortedTasks(sortedTasks) {
      taskList.innerHTML = "";
      sortedTasks.forEach(task => {
        createTaskElement(task.text, task.completed, task.alarmTime, task.taskId, task.priority);
        });
    }
      
  
    // Load tasks from localStorage
    function loadTasks() {
        chrome.storage.local.get("tasks", (result) => {
          const tasks = result.tasks || [];

          tasks.sort((a, b) => {
            const priorityOrder = {"!!!": 3, "!!": 2, "!": 1}
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          });

          taskList.innerHTML = "";
          tasks.forEach(task => {
            createTaskElement(task.text, task.completed, task.alarmTime, task.taskId, task.priority);
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
  