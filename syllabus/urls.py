

from django.urls import path
from . import views

urlpatterns = [
    path("upload/", views.upload_syllabus, name="upload_syllabus"),
    path("syllabus/<int:syllabus_id>/delete/", views.delete_syllabus, name="delete_syllabus"),
    path("syllabus/<int:syllabus_id>/", views.syllabus_detail, name="syllabus_detail"),
    path("unit/<int:unit_id>/", views.unit_detail, name="unit_detail"),
    path("unit/<int:unit_id>/extract-topics/", views.extract_topics, name="extract_topics"),
    path("unit/<int:unit_id>/add-topic/", views.add_topic, name="add_topic"),
    path("topic/<int:topic_id>/", views.topic_detail, name="topic_detail"),
    path("topic/<int:topic_id>/add-link/", views.add_link, name="add_link"),
    path("topic/<int:topic_id>/edit-name/", views.edit_topic_name, name="edit_topic_name"),
    path("topic/<int:topic_id>/edit/", views.edit_topic, name="edit_topic"),
    path("topic/<int:topic_id>/delete/", views.delete_topic, name="delete_topic"),
    path("topic/<int:topic_id>/create-note/", views.create_note, name="create_note"),
    path("topic/<int:topic_id>/upload-document/", views.upload_topic_document, name="upload_topic_document"),
    path("topic-document/<int:doc_id>/delete/", views.delete_topic_document, name="delete_topic_document"),
    path("link/<int:link_id>/delete/", views.delete_link, name="delete_link"),
]


