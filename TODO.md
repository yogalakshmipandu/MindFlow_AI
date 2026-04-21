# Drowsy Widget Persistence Task
Status: In Progress

## Approved Plan Steps

### 1. ✅ PLANNING (Complete)
- Analyzed files: drowsy-widget.js, focus.html, base.html, drowsy.html
- Plan confirmed for widget activation from both focus launch and drowsy back-button

### 2. ⏳ EDIT templates/focus.html
- Replace launch link with toggleDrowsyDetection() button
- Add dynamic status text

### 3. ⏳ EDIT templates/drowsy.html
- Replace back link with backToFocusWithWidget() button
- Add JS function to start widget before navigating

### 4. 🔍 TEST
- Focus → Launch → Widget active → Navigate dashboard/todo → Persists
- Drowsy page → Back to Focus → Widget starts → Navigates + persists

### 5. 📦 DEPLOY
- `python manage.py collectstatic`
- Full browser test across pages

**Next Action**: User approval to start Step 2 edits.


# Chatbot Maximize/Minimize Buttons ✅

## Completed Steps:
### 1. ✅ Create TODO.md
### 2. ✅ Edit templates/dashboard.html
   - Added min/max buttons (− □) to `.chatbot-header`
   - Added CSS: `.minimized` hides messages/input; `.maximized` expands to 90vw/70vh centered
   - Added JS: `minimizeChatbot()`, `maximizeChatbot()`, updated `toggleChatbot()` to restore from min
### 3. ✅ Test functionality
   - Fixed JS syntax errors from linter
   - Verified: Min collapses to header, Max expands nearly fullscreen, Toggle/Close work seamlessly

## Files Modified:
- `templates/dashboard.html`

**Updated**: Minimize now keeps previous window size (380px width), collapses height to header (70px). Toggle/close restores exactly.

Test: `python manage.py runserver`, dashboard → 💬 → test − □ ×.

**Status**: Task completed successfully! 🎉
