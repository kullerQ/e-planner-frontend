export const messages = {
  meta: {
    title: 'E-Planner',
    description: 'Plan your day with focus.',
  },
  home: {
    heading: 'Plan with clarity',
    description:
      'E-Planner helps you organize tasks, manage priorities, and keep momentum every day.',
    loginCta: 'Sign in',
    registerCta: 'Create account',
  },
  auth: {
    brand: 'E-Planner',
    login: {
      title: 'Sign in',
      submit: 'Sign in',
      submitting: 'Signing in...',
      noAccount: "Don't have an account?",
      registerLink: 'Register',
    },
    register: {
      title: 'Create account',
      submit: 'Create account',
      submitting: 'Creating account...',
      hasAccount: 'Already have an account?',
      loginLink: 'Sign in',
      passwordRequirements:
        'Password must be at least 8 characters and include uppercase, lowercase, and a number.',
    },
    fields: {
      name: 'Name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
    },
    errors: {
      validationFailed: 'Please fix the highlighted fields.',
      invalidCredentials: 'Invalid email or password.',
      registrationFailed: 'Registration failed. This email may already be in use.',
      genericServerError: 'Something went wrong. Please try again.',
    },
  },
  validation: {
    nameRequired: 'Name is required',
    nameMax: 'Name must be 255 characters or fewer',
    emailInvalid: 'Invalid email address',
    passwordMin: 'Password must be at least 8 characters',
    passwordUppercase: 'Must contain at least one uppercase letter',
    passwordLowercase: 'Must contain at least one lowercase letter',
    passwordDigit: 'Must contain at least one digit',
    confirmPasswordRequired: 'Please confirm your password',
    passwordsDoNotMatch: 'Passwords do not match',
    taskTitleRequired: 'Title is required',
    taskTitleMax: 'Title must be 500 characters or fewer',
    groupNameRequired: 'Name is required',
    groupNameMax: 'Name must be 100 characters or fewer',
    tagNameRequired: 'Name is required',
    tagNameMax: 'Name must be 50 characters or fewer',
    checklistTextRequired: 'Text is required',
    checklistTextMax: 'Text must be 500 characters or fewer',
    colorHexInvalid: 'Must be a valid hex color (#RRGGBB)',
  },
} as const
