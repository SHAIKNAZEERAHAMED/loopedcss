import {
  AlertTriangle, ArrowRight, Bell, Bot, Bookmark, Check, ChevronLeft, ChevronRight, Command, Compass, File, FileText, HelpCircle, Image, Inbox, Laptop, Loader2, LogOut, LucideProps, Moon, MoreVertical, Pizza, Plus, Settings, SunMedium, Trash, User, X, type LucideIcon, Home, Search, MessageSquare, Heart, Share, Video, Sparkles, Users, MessageCircle, PieChart, Flag, Code, Book, History, Save, Zap, Shield, Repeat2,
} from "lucide-react"

export type Icon = LucideIcon

export const Icons = {
  logo: ({ ...props }: LucideProps) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
  compass: Compass,
  google: ({ ...props }: LucideProps) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="1em" height="1em" {...props}><path fill="currentColor" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" /></svg>,
  spinner: Loader2, chevronLeft: ChevronLeft, chevronRight: ChevronRight, trash: Trash, post: FileText, page: File, media: Image, settings: Settings, billing: Command, ellipsis: MoreVertical, add: Plus, warning: AlertTriangle, alertTriangle: AlertTriangle, user: User, arrowRight: ArrowRight, help: HelpCircle, pizza: Pizza, sun: SunMedium, moon: Moon, laptop: Laptop,
  check: Check, home: Home, search: Search, message: MessageSquare, heart: Heart, share: Share, bell: Bell, x: X, inbox: Inbox, image: Image, video: Video, sparkles: Sparkles, bot: Bot, bookmark: Bookmark, logout: LogOut, users: Users, messageCircle: MessageCircle, pieChart: PieChart, flag: Flag, code: Code, book: Book, history: History, save: Save, zap: Zap, shield: Shield, loop: Repeat2,
  heartFilled: ({ ...props }: LucideProps) => <Heart {...props} fill="currentColor" />,
  bookmarkFilled: ({ ...props }: LucideProps) => <Bookmark {...props} fill="currentColor" />,
}
