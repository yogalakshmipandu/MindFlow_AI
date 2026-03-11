# MindFlow - Study Focus App

A Django-based educational web application designed to help students focus, manage their syllabi, and improve productivity.

## Features

### 🎯 Focus Mode
- **Focus Music** - Ambient sounds (Rain, Forest, Ocean, Café, Fireplace) to enhance concentration
- **Session Alarm** - Study timer with customizable study/break intervals
- **Drowsy Alerts** - Stay awake during study sessions
- **Motivational Alerts** - Periodic motivational quotes to keep you inspired
- **Study Streak** - Track your daily study progress

### 📚 Syllabus Management
- Upload and organize course syllabi
- Extract units and topics automatically
- Add links and notes to each topic
- Upload topic documents

### 🎮 Brain Games
- Fireball Escape
- Sliding Puzzle
- Sudoku

### 📝 Additional Features
- User authentication (Signup/Login)
- To-Do list with priorities
- Document management
- AI Prep - Document-based Q&A
- Mental Health Chatbot

## Tech Stack

- **Backend:** Django 5.x
- **Database:** SQLite3
- **Frontend:** HTML, CSS, JavaScript
- **AI:** Groq API, LangChain, HuggingFace Embeddings

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mindflow-study-app.git
   cd mindflow-study-app
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables:**
   - Copy `.env.example` to `.env`
   - Add your Groq API key:
     ```
     GROQ_API_KEY=your_api_key_here
     SECRET_KEY=your_django_secret_key
     ```

5. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Start the server:**
   ```bash
   python manage.py runserver
   ```

7. **Open browser:**
   Navigate to `http://127.0.0.1:8000`

## Project Structure

```
Backend/
├── accounts/          # User authentication app
├── mysite/            # Django project settings
├── syllabus/          # Syllabus management app
├── static/            # Static files (CSS, JS, images, music)
├── templates/         # HTML templates
├── media/             # User uploaded files
├── manage.py          # Django entry point
└── requirements.txt   # Python dependencies
```

## Usage

1. **Signup/Login** - Create an account to get started
2. **Dashboard** - Upload your course syllabi
3. **Focus Mode** - Start a study session with music and timers
4. **Take Breaks** - Play brain games to refresh your mind
5. **AI Prep** - Upload documents and ask questions

## License

MIT License

