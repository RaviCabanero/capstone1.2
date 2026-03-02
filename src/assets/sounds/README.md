# Notification Sounds

## Setup Instructions

The notification system is configured to play a sound file at `assets/sounds/notification.mp3` when new events or notifications are created.

### How to Add Your Notification Sound

1. **Prepare your audio file:**
   - Format: MP3
   - Duration: 0.5 - 2 seconds recommended
   - Filename: `notification.mp3`

2. **Add the file:**
   - Place `notification.mp3` in this directory (`src/assets/sounds/`)
   - File should be added to your version control

3. **Fallback Audio:**
   - If `notification.mp3` is not found, the app will use a **Web Audio API** to generate a beep sound automatically
   - No manual setup required for the fallback

### Features Implemented

✅ **Audio Notification**
- Plays when new events are created
- Plays when notifications are received
- Fallback beep if file not found

✅ **Haptic Feedback/Vibration**
- Light vibration pulses when notification appears
- Works on iOS and Android devices

✅ **Broadcast Notifications**
- When admin creates event, ALL alumni users receive notification
- Each user gets their own notification in their list

### Testing Without Audio File

The system will work fine even without the notification.mp3 file:
- Vibration will work on supported devices
- Web Audio API will generate a beep sound as fallback
- Toast notification will still appear

### Optional: Add Your Own Sound

To use a custom notification sound:
1. Download or create an MP3 file (e.g., from Freesound.org)
2. Name it `notification.mp3`
3. Copy it to this directory
4. The app will automatically use it!

### Recommended Sounds

Free notification sounds:
- https://freesound.org/ (search: "notification")
- https://mixkit.co/free-sound-effects/notification/
- https://www.zapsplat.com/ (notification sounds)

Choose a clear, non-intrusive sound that works for your app's purpose.
