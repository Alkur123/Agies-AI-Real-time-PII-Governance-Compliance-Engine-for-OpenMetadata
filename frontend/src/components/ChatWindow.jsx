import ChatMessage from "./ChatMessage";

export default function ChatWindow({ messages }) {
    return (
        <div>
            {messages.map((msg, i) => (
                <ChatMessage key={i} msg={msg} />
            ))}
        </div>
    );
}