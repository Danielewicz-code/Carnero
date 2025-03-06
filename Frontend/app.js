document.addEventListener("DOMContentLoaded", function () {
    const taskInput = document.getElementById("taskInput");
    const addTaskBtn = document.getElementById("addTask");
    const taskList = document.getElementById("taskList");
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
    taskInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            addTask();
        }
    });

    // Clear completed tasks
    clearCompletedBtn.addEventListener("click", function() {
        const completedTasks = document.querySelectorAll(".task-completed");
        completedTasks.forEach(taskSpan => {
            const li = taskSpan.closest('li');
            if (li) li.remove();
        });
        saveTasks();
        updateClearCompletedButton();
    });

    // Auto-focus on input field when extension opens
    taskInput.focus();

    // Function to add a new task
    function addTask() {
        let taskText = taskInput.value.trim();
        if (taskText) {
            // Create reminder time if format is "task @HH:MM"
            let reminderTime = null;
            const reminderMatch = taskText.match(/(.*)\s@(\d{1,2}):(\d{2})$/);
            
            if (reminderMatch) {
                taskText = reminderMatch[1].trim();
                const hours = parseInt(reminderMatch[2]);
                const minutes = parseInt(reminderMatch[3]);
                
                if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                    const now = new Date();
                    reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
                    
                    // If the time has already passed today, set it for tomorrow
                    if (reminderTime < now) {
                        reminderTime.setDate(reminderTime.getDate() + 1);
                    }
    
                    // 1) Convert to milliseconds
                    const whenInMs = reminderTime.getTime();
                    // 2) Generate a unique ID (could be the timestamp or a random string)
                    const taskId = Date.now().toString();
    
                    // 3) Send a message to background.js to schedule an alarm
                    chrome.runtime.sendMessage(
                        {
                            action: "setReminder",
                            taskId: taskId,
                            taskText: taskText,
                            reminderTime: whenInMs
                        },
                        (response) => {
                            // Optional callback to verify scheduling success
                            if (response && response.success) {
                                console.log("Reminder scheduled in background!");
                            } else {
                                console.log("Failed to schedule reminder.");
                            }
                        }
                    );
                }
            }
    
            // Create the list item
            createTaskElement(taskText, false, reminderTime);
            taskInput.value = ""; // Clear input
            saveTasks();
        }
    }
    

    // Function to create a task element
    function createTaskElement(text, completed = false, reminderTime = null) {
        let li = document.createElement("li");
        
        // Create checkbox for completion
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = completed;
        checkbox.addEventListener("change", function() {
            taskSpan.classList.toggle("task-completed", this.checked);
            saveTasks();
            updateClearCompletedButton();
        });
        
        // Create task text span
        let taskSpan = document.createElement("span");
        taskSpan.textContent = text;
        taskSpan.className = "task-text";
        if (completed) {
            taskSpan.classList.add("task-completed");
        }
        
        // Create reminder indicator if needed
        let reminderSpan = null;
        if (reminderTime) {
            reminderSpan = document.createElement("span");
            reminderSpan.className = "reminder-time";
            reminderSpan.textContent = `⏰ ${reminderTime.getHours().toString().padStart(2, '0')}:${reminderTime.getMinutes().toString().padStart(2, '0')}`;
            
            // We no longer need this setTimeout as notifications are handled by the background script
            // The background script will handle the notification when the alarm fires
        }
        
        // Create delete button
        let deleteBtn = document.createElement("button");
        deleteBtn.textContent = "❌";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener("click", function() {
            li.remove();
            saveTasks();
            updateClearCompletedButton();
        });
        
        // Assemble the task item
        li.appendChild(checkbox);
        li.appendChild(taskSpan);
        if (reminderSpan) {
            li.appendChild(reminderSpan);
        }
        li.appendChild(deleteBtn);
        
        taskList.appendChild(li);
        updateClearCompletedButton();
        
        // Add animation
        li.style.animation = "fadeIn 0.3s";
        
        return li;
    }

    // Function to save tasks to localStorage
    function saveTasks() {
        const tasks = [];
        document.querySelectorAll("#taskList li").forEach(li => {
            const checkbox = li.querySelector(".task-checkbox");
            const taskText = li.querySelector(".task-text").textContent;
            const reminderEl = li.querySelector(".reminder-time");
            
            let reminderTime = null;
            if (reminderEl) {
                const timeParts = reminderEl.textContent.replace("⏰ ", "").split(":");
                const now = new Date();
                reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                    parseInt(timeParts[0]), parseInt(timeParts[1]));
                
                // If time is in the past, it must be for tomorrow
                if (reminderTime < now) {
                    reminderTime.setDate(reminderTime.getDate() + 1);
                }
            }
            
            tasks.push({
                text: taskText,
                completed: checkbox.checked,
                reminderTime: reminderTime ? reminderTime.getTime() : null
            });
        });
        
        localStorage.setItem("carnereTasks", JSON.stringify(tasks));
    }

    // Function to load tasks from localStorage
    function loadTasks() {
        const savedTasks = localStorage.getItem("carnereTasks");
        if (savedTasks) {
            const tasks = JSON.parse(savedTasks);
            tasks.forEach(task => {
                const reminderTime = task.reminderTime ? new Date(task.reminderTime) : null;
                createTaskElement(task.text, task.completed, reminderTime);
                
                // If this task has a reminder time in the future, make sure it's scheduled
                // in the background script
                if (reminderTime && reminderTime > new Date()) {
                    const taskId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                    chrome.runtime.sendMessage({
                        action: "setReminder",
                        taskId: taskId,
                        taskText: task.text,
                        reminderTime: reminderTime.getTime()
                    });
                }
            });
        }
    }

    // Update clear completed button visibility
    function updateClearCompletedButton() {
        const hasCompletedTasks = document.querySelectorAll(".task-completed").length > 0;
        clearCompletedBtn.style.display = hasCompletedTasks ? "block" : "none";
    }
    
    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "completeTask") {
            // Find the task with the given text and mark it as complete
            document.querySelectorAll("#taskList li").forEach(li => {
                const taskText = li.querySelector(".task-text").textContent;
                if (taskText === message.taskText) {
                    const checkbox = li.querySelector(".task-checkbox");
                    checkbox.checked = true;
                    li.querySelector(".task-text").classList.add("task-completed");
                    saveTasks();
                    updateClearCompletedButton();
                }
            });
            sendResponse({ success: true });
        }
        return true; // Keep the message channel open for async responses
    });
    
    // Add focus mode toggle
    const focusModeBtn = document.createElement("button");
    focusModeBtn.textContent = "Enter Focus Mode";
    focusModeBtn.id = "focusMode";
    focusModeBtn.style.marginTop = "10px";
    document.querySelector(".container").appendChild(focusModeBtn);
    
    let focusModeActive = false;
    
    focusModeBtn.addEventListener("click", function() {
        if (!focusModeActive) {
            focusModeActive = true;
            focusModeBtn.textContent = "Exit Focus Mode";
            focusModeBtn.style.backgroundColor = "#d32f2f";
            
            // This would normally involve messaging the background script
            // to actually block sites, but we'll just simulate it here
            alert("Focus mode activated! Distracting websites would now be blocked.");
            
            // Start a timer for the focus session (25 minutes)
            const focusTimer = document.createElement("div");
            focusTimer.id = "focusTimer";
            focusTimer.textContent = "25:00";
            focusTimer.style.marginTop = "10px";
            focusTimer.style.fontSize = "18px";
            focusTimer.style.fontWeight = "bold";
            document.querySelector(".container").appendChild(focusTimer);
            
            let timeLeft = 25 * 60; // 25 minutes in seconds
            const timerInterval = setInterval(() => {
                timeLeft--;
                const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
                const seconds = (timeLeft % 60).toString().padStart(2, '0');
                focusTimer.textContent = `${minutes}:${seconds}`;
                
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    exitFocusMode();
                    alert("Focus session complete! Time for a break.");
                }
            }, 1000);
            
            // Store timer reference to clear it later
            focusModeBtn.timerInterval = timerInterval;
            
        } else {
            exitFocusMode();
        }
    });
    
    function exitFocusMode() {
        focusModeActive = false;
        focusModeBtn.textContent = "Enter Focus Mode";
        focusModeBtn.style.backgroundColor = "";
        
        if (focusModeBtn.timerInterval) {
            clearInterval(focusModeBtn.timerInterval);
        }
        
        const focusTimer = document.getElementById("focusTimer");
        if (focusTimer) {
            focusTimer.remove();
        }
        
        // This would normally involve messaging the background script
        // to unblock sites
    }
});