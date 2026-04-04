from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

class SignUpForm(UserCreationForm):
    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')

class LoginForm(forms.Form):
    username = forms.CharField(label='Username or Email', max_length=150)
    password = forms.CharField(widget=forms.PasswordInput)

    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')

        if username and password:
            self.user_cache = authenticate(username=username.strip().lower(), password=password)
            if self.user_cache is None:
                raise forms.ValidationError('Invalid username/email or password')
            return self.cleaned_data

        self.user_cache = None
        return self.cleaned_data

    def get_user(self):
        return self.user_cache
