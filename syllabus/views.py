
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.template.loader import render_to_string
import fitz
import re
import json
import os
from groq import Groq
from dotenv import load_dotenv
from .models import Syllabus, Unit, Topic, TopicLink, TopicDocument
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extract_text_from_pdf(file):
    """Extract text from PDF file using PyMuPDF."""
    file.seek(0)
    text = ""
    try:
        with fitz.open(stream=file.read(), filetype="pdf") as doc:
            for page in doc:
                text += page.get_text()
    except Exception as e:
        print(f"Error extracting PDF: {e}")
    file.seek(0)
    return text

def extract_units(text):
    """Extract units from syllabus text using regex."""
    unit_pattern = r"(UNIT\s+[IVX\d]+\s*[:\-]?\s*[A-Za-z\s]*)"
    parts = re.split(unit_pattern, text, flags=re.IGNORECASE)
    units = {}
    for i in range(1, len(parts), 2):
        if i+1 < len(parts):
            unit_name = parts[i].strip()
            unit_content = parts[i+1].strip()
            if unit_name:
                units[unit_name] = unit_content
    return units

def extract_topics_with_llm(unit_text):
    """Extract topics from unit text using LLM."""
    prompt = f"""
Extract topic names from the syllabus text below.
Return ONLY a JSON array of topic names, nothing else.

Example format: ["Topic 1", "Topic 2", "Topic 3"]

Text:
{unit_text[:3000]}
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You extract syllabus topics as a JSON array."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )
        content = response.choices[0].message.content.strip()
        # Try to parse JSON array
        topics = json.loads(content)
        return topics if isinstance(topics, list) else []
    except Exception as e:
        print(f"Error extracting topics: {e}")
        return []

@login_required
def upload_syllabus(request):
    """Handle syllabus PDF upload and extraction."""
    if request.method == "POST":
        pdf_file = request.FILES.get("syllabus")
        title = request.POST.get("title", "Untitled Syllabus")
        
        if not pdf_file:
            messages.error(request, "Please select a PDF file.")
            return redirect("dashboard")
        
        if not pdf_file.name.endswith('.pdf'):
            messages.error(request, "Only PDF files are allowed.")
            return redirect("dashboard")
        
        try:
            # Extract text from PDF
            text = extract_text_from_pdf(pdf_file)
            
            if not text.strip():
                messages.error(request, "Could not extract text from PDF.")
                return redirect("dashboard")
            
            # Extract units
            units_dict = extract_units(text)
            
            # Save syllabus to database
            syllabus = Syllabus.objects.create(
                user=request.user,
                title=title,
                pdf_file=pdf_file
            )
            
            # Save units to database
            for unit_name, unit_content in units_dict.items():
                unit = Unit.objects.create(
                    syllabus=syllabus,
                    name=unit_name,
                    content=unit_content[:5000]  # Limit content length
                )
            
            messages.success(request, f"Syllabus uploaded successfully! Found {len(units_dict)} units.")
            return redirect("syllabus_detail", syllabus_id=syllabus.id)
            
        except Exception as e:
            messages.error(request, f"Error processing syllabus: {str(e)}")
            return redirect("dashboard")
    
    return redirect("dashboard")

@login_required
def syllabus_detail(request, syllabus_id):
    """Show syllabus details with units."""
    syllabus = get_object_or_404(Syllabus, id=syllabus_id, user=request.user)
    units = syllabus.units.all()
    return render(request, "syllabus_detail.html", {"syllabus": syllabus, "units": units})

@login_required
def delete_syllabus(request, syllabus_id):
    """Delete a syllabus and all its associated data."""
    syllabus = get_object_or_404(Syllabus, id=syllabus_id, user=request.user)
    
    try:
        syllabus.delete()
        messages.success(request, "Syllabus deleted successfully!")
    except Exception as e:
        messages.error(request, f"Error deleting syllabus: {str(e)}")
    
    return redirect("dashboard")

@login_required
def unit_detail(request, unit_id):
    """Show unit details with topics."""
    unit = get_object_or_404(Unit, id=unit_id, syllabus__user=request.user)
    topics = unit.topics.all()
    return render(request, "unit_detail.html", {"unit": unit, "topics": topics})

@login_required
def extract_topics(request, unit_id):
    """Extract topics for a unit using LLM."""
    unit = get_object_or_404(Unit, id=unit_id, syllabus__user=request.user)
    
    if request.method == "POST":
        topics = extract_topics_with_llm(unit.content)
        
        # Save topics to database
        for topic_name in topics:
            Topic.objects.create(unit=unit, name=topic_name)
        
        messages.success(request, f"Extracted {len(topics)} topics!")
        return redirect("unit_detail", unit_id=unit.id)
    
    return redirect("unit_detail", unit_id=unit.id)

@login_required
def topic_detail(request, topic_id):
    """Show topic details with links and documents."""
    topic = get_object_or_404(Topic, id=topic_id, unit__syllabus__user=request.user)
    links = topic.links.all()
    documents = topic.documents.all()
    return render(request, "topic_detail.html", {"topic": topic, "links": links, "documents": documents})

@login_required
def add_link(request, topic_id):
    """Add a link to a topic."""
    topic = get_object_or_404(Topic, id=topic_id, unit__syllabus__user=request.user)
    
    if request.method == "POST":
        link_type = request.POST.get("link_type")
        url = request.POST.get("url")
        title = request.POST.get("title", "")
        
        if url:
            TopicLink.objects.create(
                topic=topic,
                link_type=link_type,
                url=url,
                title=title
            )
            messages.success(request, "Link added successfully!")
        
        return redirect("topic_detail", topic_id=topic.id)
    
    return redirect("topic_detail", topic_id=topic.id)

@login_required
def delete_link(request, link_id):
    """Delete a link from a topic."""
    link = get_object_or_404(TopicLink, id=link_id, topic__unit__syllabus__user=request.user)
    topic_id = link.topic.id
    link.delete()
    messages.success(request, "Link deleted!")
    return redirect("topic_detail", topic_id=topic_id)

@login_required
def edit_topic_name(request, topic_id):
    """Edit topic name via AJAX."""
    if request.method == "POST":
        topic = get_object_or_404(Topic, id=topic_id, unit__syllabus__user=request.user)
        new_name = request.POST.get("name", "").strip()
        
        if new_name:
            topic.name = new_name
            topic.save()
            return JsonResponse({"success": True, "name": new_name})
        
        return JsonResponse({"success": False, "error": "Name cannot be empty"})
    
    return JsonResponse({"success": False, "error": "Invalid request"})

@login_required
def create_note(request, topic_id):
    """Create and download notes as Word document."""
    if request.method == "POST":
        topic = get_object_or_404(Topic, id=topic_id, unit__syllabus__user=request.user)
        note_content = request.POST.get("note_content", "")
        
        if note_content:
            # Create PDF document
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []
            
            # Add title
            title = Paragraph(f"Notes: {topic.name}", styles['Title'])
            story.append(title)
            story.append(Spacer(1, 12))
            
            # Add content
            content = Paragraph(note_content.replace('\n', '<br/>'), styles['Normal'])
            story.append(content)
            
            doc.build(story)
            buffer.seek(0)
            
            # Return as downloadable file
            response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{topic.name}_notes.pdf"'
            return response
        
        messages.error(request, "Please write some content for your notes.")
        return redirect("topic_detail", topic_id=topic.id)
    
    return redirect("topic_detail", topic_id=topic.id)

@login_required
def add_topic(request, unit_id):
    """Add a new topic to a unit."""
    if request.method == "POST":
        unit = get_object_or_404(Unit, id=unit_id, syllabus__user=request.user)
        topic_name = request.POST.get("topic_name", "").strip()
        
        if topic_name:
            Topic.objects.create(unit=unit, name=topic_name)
            messages.success(request, "Topic added successfully!")
        
        return redirect("unit_detail", unit_id=unit.id)
    
    return redirect("unit_detail", unit_id=unit_id)

@login_required
def edit_topic(request, topic_id):
    """Edit a topic's name."""
    if request.method == "POST":
        topic = get_object_or_404(Topic, id=topic_id, unit__syllabus__user=request.user)
        topic_name = request.POST.get("topic_name", "").strip()
        
        if topic_name:
            topic.name = topic_name
            topic.save()
            messages.success(request, "Topic updated successfully!")
        
        return redirect("unit_detail", unit_id=topic.unit.id)
    
    return redirect("unit_detail", unit_id=topic.unit.id)

@login_required
def delete_topic(request, topic_id):
    """Delete a topic."""
    topic = get_object_or_404(Topic, id=topic_id, unit__syllabus__user=request.user)
    unit_id = topic.unit.id
    topic.delete()
    messages.success(request, "Topic deleted!")
    return redirect("unit_detail", unit_id=unit_id)


@login_required
def upload_topic_document(request, topic_id):
    """Upload a document/note for a topic."""
    topic = get_object_or_404(Topic, id=topic_id, unit__syllabus__user=request.user)
    
    if request.method == "POST":
        title = request.POST.get("title", "").strip()
        document_type = request.POST.get("document_type", "notes")
        doc_file = request.FILES.get("document")
        
        if not title:
            title = doc_file.name if doc_file else "Untitled Document"
        
        if doc_file:
            TopicDocument.objects.create(
                topic=topic,
                title=title,
                file=doc_file,
                document_type=document_type
            )
            messages.success(request, "Document uploaded successfully!")
        else:
            messages.error(request, "Please select a file to upload.")
        
        return redirect("topic_detail", topic_id=topic.id)
    
    return redirect("topic_detail", topic_id=topic.id)


@login_required
def delete_topic_document(request, doc_id):
    """Delete a document from a topic."""
    doc = get_object_or_404(TopicDocument, id=doc_id, topic__unit__syllabus__user=request.user)
    topic_id = doc.topic.id
    doc.delete()
    messages.success(request, "Document deleted!")
    return redirect("topic_detail", topic_id=topic_id)


