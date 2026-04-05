from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .forms import SignUpForm, LoginForm
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from django.shortcuts import render, redirect


def signup_view(request):
    if request.method == "POST":
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)  # Automatically log in the user
            return redirect("dashboard")  # Change to your dashboard URL name
        else:
            print("FORM ERRORS:", form.errors)  # Debug form errors
    else:
        form = SignUpForm()

    return render(request, "signup.html", {"form": form})

def login_view(request):
    """Handle user login with username/email."""
    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            user = form.user_cache
            login(request, user)
            next_url = request.GET.get('next', 'dashboard')
            return redirect(next_url)
    else:
        form = LoginForm()
    return render(request, "login.html", {"form": form})


@login_required
def logout_view(request):
    """Handle user logout."""
    logout(request)
    # The JavaScript will clear localStorage on page load for non-authenticated users
    messages.success(request, "You have been logged out.")
    return redirect("login")

