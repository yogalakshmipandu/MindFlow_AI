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

