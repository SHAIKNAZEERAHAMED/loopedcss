declare module "@/contexts/AuthContext" {
  import { User } from "firebase/auth"
  
  interface AuthContextType {
    user: User | null
    loading: boolean
  }
  
  export function useAuth(): AuthContextType
  export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element
}

declare module "@/lib/firebase/posts" {
  export function isLiked(postId: string, userId: string): Promise<boolean>
  export function likePost(postId: string, userId: string): Promise<void>
  export function unlikePost(postId: string, userId: string): Promise<void>
} 