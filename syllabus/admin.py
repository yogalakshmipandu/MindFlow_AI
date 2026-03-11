from django.contrib import admin
from .models import Syllabus, Unit, Topic, TopicLink

# Register your models here.
admin.site.register(Syllabus)
admin.site.register(Unit)
admin.site.register(Topic)
admin.site.register(TopicLink)

