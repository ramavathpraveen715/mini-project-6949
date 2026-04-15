# Firebase Realtime Database Setup

1. Go to https://console.firebase.google.com and create a new project.
2. In the project, open "Realtime Database" and create a database instance.
3. Set the database rules to allow read/write for testing:

```json
{
  "rules": {
    ".read": true,
    ".write": true
n  }
}
```

4. Copy the database URL, for example:

```
https://your-project.firebaseio.com/
```

5. Update `arduino/esp32_farm_monitor.ino` with the full path:

```cpp
const char* firebaseUrl = "https://your-project.firebaseio.com/data.json";
```

6. After the ESP32 posts JSON, you can use the data in the dashboard.

> For production, tighten Firebase security rules and use authentication.
