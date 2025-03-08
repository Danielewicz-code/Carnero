chrome.alarms.onAlarm.addListener(alarm => { 
    // Use alarm.name (which is taskId) as the notification ID
    chrome.notifications.create(alarm.name, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/alarm_icon.png"),
      title: "Task Reminder",
      message: `Reminder for task: ${alarm.time}`,
      requireInteraction: true,
      buttons: [
        { title: "Mark as Done ✅" }
      ]
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