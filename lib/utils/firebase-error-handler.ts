export function getFirebaseErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "This email is already in use. Please try another email or sign in."
    case "auth/invalid-email":
      return "The email address is invalid. Please enter a valid email."
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support."
    case "auth/user-not-found":
      return "No account found with this email. Please sign up."
    case "auth/wrong-password":
      return "Incorrect password. Please try again."
    case "auth/weak-password":
      return "Password is too weak. Please use a stronger password."
    case "auth/operation-not-allowed":
      return "This operation is not allowed. Please contact support."
    case "auth/too-many-requests":
      return "Too many unsuccessful login attempts. Please try again later."
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection."
    default:
      return "An error occurred. Please try again."
  }
}

