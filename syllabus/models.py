from django.db import models
from django.contrib.auth.models import User

class Syllabus(models.Model):
    """Model for storing uploaded syllabus PDFs."""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    pdf_file = models.FileField(upload_to='syllabi/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title

class Task(models.Model):
    """Model for storing personalized tasks per user."""
    PRIORITY_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    STATUS_CHOICES = [
        ('todo', 'To-Do'),
        ('progress', 'In Progress'),
        ('done', 'Done'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    due_date = models.DateField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='todo')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title

class Document(models.Model):
    """Model for storing general documents like assignments, question papers, etc."""
    DOCUMENT_TYPES = [
        ('syllabus', 'Syllabus'),
        ('assignment', 'Assignment'),
        ('question_paper', 'Question Paper'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, default='other')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title

class Unit(models.Model):
    """Model for storing units extracted from syllabus."""
    syllabus = models.ForeignKey(Syllabus, on_delete=models.CASCADE, related_name='units')
    name = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    
    def __str__(self):
        return self.name

class Topic(models.Model):
    """Model for storing topics within a unit."""
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='topics')
    name = models.CharField(max_length=255)
    
    def __str__(self):
        return self.name

class TopicLink(models.Model):
    """Model for storing links (website, youtube, doc, image) for a topic."""
    LINK_TYPES = [
        ('website', 'Website'),
        ('youtube', 'YouTube'),
        ('doc', 'Document'),
        ('image', 'Image'),
    ]
    
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='links')
    link_type = models.CharField(max_length=20, choices=LINK_TYPES)
    url = models.URLField()
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.link_type}: {self.title or self.url}"


class TopicDocument(models.Model):
    """Model for storing uploaded documents/notes for a topic."""
    DOCUMENT_TYPES = [
        ('notes', 'Notes'),
        ('assignment', 'Assignment'),
        ('other', 'Other'),
    ]
    
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='topic_documents/')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, default='notes')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title

