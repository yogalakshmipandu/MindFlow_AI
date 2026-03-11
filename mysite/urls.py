"""
URL configuration for mysite project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("accounts.urls")),
    path("", include("syllabus.urls")),
    path("focus/", views.focus_view, name="focus"),
    path("game/fireball/", views.game_fireball, name="game_fireball"),
    path("game/sliding/", views.game_sliding, name="game_sliding"),
    path("game/sudoku/", views.game_sudoku, name="game_sudoku"),
    path("drowsy/", views.drowsy_view, name="drowsy"),
    path("todo/", views.todo_view, name="todo"),
    path("todo/update/<int:task_id>/<str:status>/", views.update_task_status, name="update_task_status"),
    path("todo/delete/<int:task_id>/", views.delete_task, name="delete_task"),
    path("documents/", views.documents_view, name="documents"),
    path("documents/delete/<int:doc_id>/", views.delete_document, name="delete_document"),
    path("profile/", views.profile_view, name="profile"),
    path("ai-prep/", views.ai_prep_view, name="ai_prep"),
    path("ai-prep/process/", views.process_ai_prep_input, name="process_ai_prep"),
    path("ai-prep/qa/", views.ai_prep_qa, name="ai_prep_qa"),
    path("chatbot/", views.chatbot_view, name="chatbot"),
    path("chatbot/chat/", views.chatbot_chat, name="chatbot_chat"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

