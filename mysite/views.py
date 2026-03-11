"""
Views for mysite project.
"""
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
import fitz
import re

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

@login_required
def dashboard_view(request):
    """Dashboard view showing upload form and user's syllabi."""
    from syllabus.models import Syllabus, Unit
    
    syllabi = Syllabus.objects.filter(user=request.user).order_by('-uploaded_at')
    return render(request, "dashboard.html", {"syllabi": syllabi})

@login_required
def focus_view(request):
    """Focus mode view with productivity features."""
    return render(request, "focus.html")

@login_required
def game_fireball(request):
    """Fireball Escape game."""
    return render(request, "game_fireball.html")

@login_required
def game_sliding(request):
    """Sliding Puzzle game."""
    return render(request, "game_sliding.html")

@login_required
def game_sudoku(request):
    """Sudoku game."""
    return render(request, "game_sudoku.html")

@login_required
def drowsy_view(request):
    """Drowsy detection view with browser-based eye tracking."""
    return render(request, "drowsy.html")

@login_required
def todo_view(request):
    """To-Do list view with personalized task management per user."""
    from syllabus.models import Task
    
    if request.method == 'POST':
        title = request.POST.get('title')
        due_date = request.POST.get('due_date')
        priority = request.POST.get('priority')
        
        if title and due_date:
            Task.objects.create(
                user=request.user,
                title=title,
                due_date=due_date,
                priority=priority
            )
            return redirect('todo')
    
    tasks = Task.objects.filter(user=request.user).order_by('due_date')
    return render(request, "todo.html", {"tasks": tasks})

@login_required
def update_task_status(request, task_id, status):
    """Update task status."""
    from syllabus.models import Task
    
    try:
        task = Task.objects.get(id=task_id, user=request.user)
        task.status = status
        task.save()
    except Task.DoesNotExist:
        pass
    
    return redirect('todo')

@login_required
def delete_task(request, task_id):
    """Delete a task."""
    from syllabus.models import Task
    
    try:
        task = Task.objects.get(id=task_id, user=request.user)
        task.delete()
    except Task.DoesNotExist:
        pass
    
    return redirect('todo')

@login_required
def documents_view(request):
    """All documents view showing user's uploaded documents and syllabi."""
    from syllabus.models import Document, Syllabus
    
    if request.method == 'POST':
        title = request.POST.get('title')
        document = request.FILES.get('document')
        document_type = request.POST.get('document_type')
        
        if title and document:
            doc = Document.objects.create(
                user=request.user,
                title=title,
                file=document,
                document_type=document_type
            )
            return redirect('documents')
    
    # Get all documents and syllabi for the user
    documents = Document.objects.filter(user=request.user).order_by('-uploaded_at')
    syllabi = Syllabus.objects.filter(user=request.user).order_by('-uploaded_at')
    
    return render(request, "documents.html", {
        "documents": documents,
        "syllabi": syllabi
    })

@login_required
def delete_document(request, doc_id):
    """Delete a document."""
    from syllabus.models import Document
    
    try:
        doc = Document.objects.get(id=doc_id, user=request.user)
        doc.file.delete()
        doc.delete()
    except Document.DoesNotExist:
        pass
    
    return redirect('documents')

@login_required
def profile_view(request):
    """User profile view showing user information and settings."""
    from syllabus.models import Syllabus, Document, Task
    
    syllabi_count = Syllabus.objects.filter(user=request.user).count()
    documents_count = Document.objects.filter(user=request.user).count()
    tasks_count = Task.objects.filter(user=request.user).count()
    completed_tasks = Task.objects.filter(user=request.user, status='done').count()
    
    # Calculate completion percentage
    if tasks_count > 0:
        completion_percentage = int((completed_tasks / tasks_count) * 100)
    else:
        completion_percentage = 0
    
    return render(request, "profile.html", {
        "user": request.user,
        "syllabi_count": syllabi_count,
        "documents_count": documents_count,
        "tasks_count": tasks_count,
        "completed_tasks": completed_tasks,
        "completion_percentage": completion_percentage,
    })

@login_required
def ai_prep_view(request):
    """AI Prep view - renders the full interactive AI Prep interface."""
    return render(request, "ai_prep.html")

@login_required
@csrf_exempt
def process_ai_prep_input(request):
    """API endpoint to process input data (Link, PDF, Text, DOCX, TXT) and create vectorstore."""
    from django.http import JsonResponse
    import faiss
    import numpy as np
    from docx import Document
    from PyPDF2 import PdfReader
    from langchain_community.document_loaders import WebBaseLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import FAISS
    from langchain_community.docstore.in_memory import InMemoryDocstore
    import os
    import pickle

    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)

    try:
        input_type = request.POST.get('input_type')
        user_id = request.user.id

        raw_text = ""
        
        if input_type == "Link":
            links = request.POST.getlist('links')
            if not links:
                return JsonResponse({'error': 'No links provided'}, status=400)
            for url in links:
                loader = WebBaseLoader(url)
                docs = loader.load()
                raw_text += "\n".join([doc.page_content for doc in docs]) + "\n"

        elif input_type == "PDF":
            uploaded_file = request.FILES.get('file')
            if not uploaded_file:
                return JsonResponse({'error': 'No PDF uploaded'}, status=400)
            pdf_reader = PdfReader(uploaded_file)
            raw_text = "".join([page.extract_text() for page in pdf_reader.pages if page.extract_text()])
        elif input_type == "Text":
            raw_text = request.POST.get('text_content', '')
            if not raw_text:
                return JsonResponse({'error': 'No text provided'}, status=400)

        elif input_type == "DOCX":
            uploaded_file = request.FILES.get('file')
            if not uploaded_file:
                return JsonResponse({'error': 'No DOCX uploaded'}, status=400)
            doc = Document(uploaded_file)
            raw_text = "\n".join([para.text for para in doc.paragraphs])

        elif input_type == "TXT":
            uploaded_file = request.FILES.get('file')
            if not uploaded_file:
                return JsonResponse({'error': 'No TXT uploaded'}, status=400)
            raw_text = uploaded_file.read().decode('utf-8')
        
        else:
            return JsonResponse({'error': 'Unsupported input type'}, status=400)

        # Check word limit
        word_count = len(raw_text.split())
        MAX_WORD_LIMIT = 5000
        if word_count > MAX_WORD_LIMIT:
            return JsonResponse({
                'error': f'Document too large. {word_count} words exceeds limit of {MAX_WORD_LIMIT} words.'
            }, status=400)

        # Split text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, 
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
        texts = text_splitter.split_text(raw_text)

        if not texts:
            return JsonResponse({'error': 'No text could be extracted from the document'}, status=400)

        # Create embeddings and vectorstore
        model_name = "sentence-transformers/all-mpnet-base-v2"
        model_kwargs = {'device': 'cpu'}
        encode_kwargs = {'normalize_embeddings': False}

        hf_embeddings = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs=model_kwargs,
            encode_kwargs=encode_kwargs
        )

        sample_embedding = np.array(hf_embeddings.embed_query("sample text"))
        dimension = sample_embedding.shape[0]
        index = faiss.IndexFlatL2(dimension)
        
        vector_store = FAISS(
            embedding_function=hf_embeddings.embed_query,
            index=index,
            docstore=InMemoryDocstore(),
            index_to_docstore_id={},
        )
        vector_store.add_texts(texts)

        # Save vectorstore to session (or file for persistence)
        faiss_index = vector_store.index
        docstore = vector_store.docstore
        index_to_docstore_id = vector_store.index_to_docstore_id
        
        # Store serialized vectorstore in media folder per user
        vectorstore_path = os.path.join('media', 'vectorstores')
        os.makedirs(vectorstore_path, exist_ok=True)
        
        vs_file = os.path.join(vectorstore_path, f'vs_user_{user_id}.pkl')
        with open(vs_file, 'wb') as f:
            pickle.dump({
                'index': faiss_index,
                'docstore': docstore,
                'index_to_docstore_id': index_to_docstore_id,
                'texts': texts
            }, f)

        return JsonResponse({
            'success': True,
            'message': f'Data processed successfully! {len(texts)} chunks created.',
            'word_count': word_count
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# Chatbot views
@login_required
def chatbot_view(request):
    """Chatbot view - renders the mental health chatbot interface."""
    return render(request, "chatbot.html")

@login_required
@csrf_exempt
def chatbot_chat(request):
    """API endpoint for chatbot conversation."""
    from django.http import JsonResponse
    from groq import Groq
    import os
    import json

    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)

    try:
        # Parse JSON body correctly
        data = json.loads(request.body)
        user_message = data.get('message')
        
        if not user_message:
            return JsonResponse({'error': 'No message provided'}, status=400)

        # Get Groq API key from environment
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            return JsonResponse({'error': 'Groq API Key not configured. Please set GROQ_API_KEY in .env file.'}, status=500)

        client = Groq(api_key=groq_api_key)

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": """You are a student mental-wellbeing assistant. Your role is to support students with their emotional and mental health concerns.

RESPONSE GUIDELINES:
1. Always respond pleasantly, kindly, and with empathy
2. Consider the student's stress, health, and mental state in every response
3. Provide supportive and encouraging suggestions
4. Keep responses concise and easy to understand

TOPICS YOU CAN HELP WITH:
- Academic stress and pressure
- Exam anxiety
- Relationship issues
- Homesickness
- Time management and productivity
- Sleep and health concerns
- Self-esteem and confidence
- Motivation and burnout
- Any emotional concerns students face

IMPORTANT RULES:
- If asked about coding, general knowledge, or topics unrelated to student wellbeing, politely decline and redirect to how you can help with their mental health
- Never provide medical diagnoses - always suggest consulting professionals when appropriate
- Be a good listener and validate their feelings
- Offer practical, actionable advice when possible
- End responses with encouraging words or open-ended questions to continue the conversation"""
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ]
        )

        reply = response.choices[0].message.content

        return JsonResponse({'reply': reply})

    except json.JSONDecodeError as e:
        print("JSON Error:", e)
        return JsonResponse({'reply': 'Invalid request format'}, status=400)
    except Exception as e:
        print("Error:", e)
        return JsonResponse({'reply': 'AI service unavailable. Please try again later.'}, status=500)

@login_required
@csrf_exempt
def ai_prep_qa(request):
    """API endpoint to answer questions using the vectorstore."""
    from django.http import JsonResponse
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.runnables import RunnablePassthrough
    from langchain_core.output_parsers import StrOutputParser
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import FAISS
    from langchain_groq import ChatGroq
    import os
    import pickle
    import numpy as np

    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)

    try:
        query = request.POST.get('question', '').strip()
        if not query:
            return JsonResponse({'error': 'No question provided'}, status=400)

        user_id = request.user.id
        vs_file = os.path.join('media', 'vectorstores', f'vs_user_{user_id}.pkl')

        if not os.path.exists(vs_file):
            return JsonResponse({'error': 'No document processed yet. Please upload a document first.'}, status=400)

        # Load vectorstore
        with open(vs_file, 'rb') as f:
            vs_data = pickle.load(f)

        # Recreate vectorstore
        model_name = "sentence-transformers/all-mpnet-base-v2"
        model_kwargs = {'device': 'cpu'}
        encode_kwargs = {'normalize_embeddings': False}

        hf_embeddings = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs=model_kwargs,
            encode_kwargs=encode_kwargs
        )

        vector_store = FAISS(
            embedding_function=hf_embeddings.embed_query,
            index=vs_data['index'],
            docstore=vs_data['docstore'],
            index_to_docstore_id=vs_data['index_to_docstore_id'],
        )

        # Get Groq API key
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            return JsonResponse({'error': 'Groq API Key not configured'}, status=500)

        # Create RAG chain
        llm = ChatGroq(
            model="llama-3.1-8b-instant", 
            temperature=0.1,
            api_key=groq_api_key
        )

        retriever = vector_store.as_retriever(search_kwargs={"k": 3})

        system_prompt = """You are an advanced AI assistant. Your goal is to provide accurate answers based on the context provided.

<context>
{context}
</context>

**CITATION REQUIREMENT:**
* Every answer must include citations or references to the context (e.g., "According to the document...", "As mentioned in the text...").
* Do not state facts without backing them up from the provided text.

**ROLE 1: The Strict Analyst (Use for Summaries, Facts, Data, Quotes, or specific sections)**
* **Trigger:** If the user asks to "brief", "explain", "describe", "define", "summarize", "summarization", "quote", "print", or asks specific factual questions.
* **Strict Summarization Rule:** When asked to summarize, create a concise or detailed summary utilizing *ONLY* the information present in the context as per user's question. Do not add external knowledge, opinions, or fluff.
* **Extraction:** If asked to quote, extract the text verbatim.

**ROLE 2: The Creative Synthesizer (Use for Essays & Content Creation)**
* **Trigger:** If the user asks to "write an essay", "create a blog", "brainstorm ideas", "explain to a beginner", "explain advanced concepts" or "explain like I'm 5".
* You may structure the answer creatively (hooks, intros, bodies) but the *substance* must be grounded in the context.
* You may synthesize different parts of the context to form a new, coherent narrative.
* Maintain the factual accuracy of the source material, even when writing creatively.

**Constraint:**
If the information is not in the context, say: "I cannot find this information in the provided context by you."
"""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{question}"),
        ])

        rag_chain = (
            {
                "context": retriever,
                "question": RunnablePassthrough()
            }
            | prompt
            | llm
            | StrOutputParser()
        )

        answer = rag_chain.invoke(query)

        return JsonResponse({
            'success': True,
            'question': query,
            'answer': answer,
            'model': 'llama-3.1-8b-instant'
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

