import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: {
    id: number
    sender: string
    text: string
    timestamp: string
  }
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isSeller = message.sender === "seller"

  return (
    <div className={cn("flex", isSeller ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
          isSeller
            ? "bg-gradient-to-r from-blue-50 to-blue-100 rounded-tl-none text-gray-800"
            : "bg-gradient-to-r from-purple-500 to-blue-500 rounded-tr-none text-white",
        )}
      >
        <p className="text-sm md:text-base">{message.text}</p>
        <p className={cn("text-xs mt-1 text-right", isSeller ? "text-gray-500" : "text-blue-100")}>
          {message.timestamp}
        </p>
      </div>
    </div>
  )
}
