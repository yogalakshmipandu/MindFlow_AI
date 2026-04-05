from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import authenticate
from django.contrib.auth.models import User


class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=True, help_text="Required. Enter a valid email address.")

    class Meta:
        model = User
        fields = ("username", "email", "password1", "password2")

class LoginForm(forms.Form):
    username = forms.CharField(label='Username or Email', max_length=150)
    password = forms.CharField(widget=forms.PasswordInput)

    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')

        if username and password:
            username = username.strip()
            self.user_cache = authenticate(username=username, password=password)
            if self.user_cache is None and '@' in username:
                try:
                    user = User.objects.get(email__iexact=username)
                except User.DoesNotExist:
                    user = None

                if user is not None:
                    self.user_cache = authenticate(username=user.username, password=password)

            if self.user_cache is None:
                raise forms.ValidationError('Invalid username/email or password')
            return self.cleaned_data

        self.user_cache = None
        return self.cleaned_data

    def get_user(self):
        return self.user_cache
