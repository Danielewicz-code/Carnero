chrome.alarms.onAlarm.addListener(alarm => {
  const taskId = alarm.name;
  // Retrieve the task text from storage
  chrome.storage.local.get(taskId, data => {
      const taskText = data[taskId] || "No task text available";

      // Show the notification with the retrieved task text
      chrome.notifications.create(taskId, {
          type: "basic",
          iconUrl: chrome.runtime.getURL("icons/alarm_icon.png"),
          title: "Task Reminder",
          message: `Reminder for task: ${taskText}`,
          requireInteraction: true,
          buttons: [
              { title: "Mark as Done ✅" }
          ]
      });
      
      console.log(`Alarm triggered for ${taskId}: "${taskText}"`);
  });
});
  
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
      // Update task in chrome.storage.local
      chrome.storage.local.get("tasks", (result) => {
        let tasks = result.tasks || [];
        tasks = tasks.map(task => {
          if (task.taskId === notificationId) {
            task.completed = true;
          }
          return task;
        });
        chrome.storage.local.set({ tasks }, () => {
          console.log("Task updated in storage");

          chrome.runtime.sendMessage({action: "completeTask", taskId: notificationId}, (Response) => {
            console.log("message sent, response:", Response)
          })
        });
      });
      chrome.notifications.clear(notificationId);
    }
  });