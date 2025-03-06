// Background script for Carnero ToDo Extension

// Handle focus mode site blocking
let blockedSites = [];
let isFocusModeActive = false;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startFocusMode") {
    isFocusModeActive = true;
    blockedSites = message.sites || [
      "facebook.com",
      "twitter.com",
      "instagram.com",
      "reddit.com",
      "youtube.com"
    ];
    
    // Set an alarm to automatically end focus mode after the duration
    chrome.alarms.create("endFocusMode", {
      delayInMinutes: message.duration || 25
    });
    
    sendResponse({ success: true });
  }
  
  if (message.action === "endFocusMode") {
    isFocusModeActive = false;
    blockedSites = [];
    
    // Clear the focus mode alarm if it exists
    chrome.alarms.clear("endFocusMode");
    
    sendResponse({ success: true });
  }
  
  if (message.action === "checkFocusMode") {
    sendResponse({ 
      active: isFocusModeActive,
      sites: blockedSites
    });
  }
  
  // Handle reminders that persist even when popup is closed
  if (message.action === "setReminder") {
    const { taskId, taskText, reminderTime } = message;
    
    console.log(`Setting reminder for task: ${taskText} at time: ${new Date(reminderTime).toLocaleString()}`);
    
    // 1) Create an alarm named "reminder_<taskId>" for the specified time
    chrome.alarms.create(`reminder_${taskId}`, {
      when: reminderTime // in ms since epoch
    });
    
    // 2) Store task details for retrieval when the alarm fires
    chrome.storage.local.set({
      [`reminder_${taskId}`]: {
        taskText: taskText,
        reminderTime: reminderTime
      }
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error storing reminder:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        console.log("Reminder stored successfully");
        sendResponse({ success: true });
      }
    });
  }
  
  return true; // Keep for async use of sendResponse
});

// Handle reminder alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`Alarm fired: ${alarm.name}`);
  
  if (alarm.name === "endFocusMode") {
    isFocusModeActive = false;
    blockedSites = [];
    
    // Notify the user that focus mode has ended
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Focus Mode Ended",
      message: "Great job! Time for a break."
    });
  }
  
  else if (alarm.name.startsWith("reminder_")) {
    const taskId = alarm.name.replace("reminder_", "");
    
    // Get the task details
    chrome.storage.local.get([`reminder_${taskId}`], (result) => {
      const taskDetails = result[`reminder_${taskId}`];
      
      if (taskDetails) {
        console.log(`Showing notification for task: ${taskDetails.taskText}`);
        
        // Show notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon128.png", // Make sure this path is correct
          title: "Task Reminder",
          message: taskDetails.taskText,
          buttons: [
            { title: "Mark as Completed" }
          ],
          requireInteraction: true // This makes the notification persist until user interaction
        });
        
        // Clean up storage
        chrome.storage.local.remove([`reminder_${taskId}`]);
      } else {
        console.error(`No task details found for reminder_${taskId}`);
      }
    });
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) { // "Mark as Completed" button
    // Get the notification details to find which task it was for
    chrome.notifications.get(notificationId, (notification) => {
      if (notification) {
        // Send message to popup to mark the task as complete
        chrome.runtime.sendMessage({
          action: "completeTask",
          taskText: notification.message
        });
        
        // Close the notification
        chrome.notifications.clear(notificationId);
      }
    });
  }
});

// Make sure we have notification permission
chrome.runtime.onInstalled.addListener(() => {
  // This ensures we have notification permission when the extension is installed
  if (chrome.notifications) {
    chrome.notifications.getPermissionLevel((level) => {
      console.log(`Notification permission level: ${level}`);
    });
  }
});