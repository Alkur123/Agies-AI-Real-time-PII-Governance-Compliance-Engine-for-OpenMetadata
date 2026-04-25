import { useState } from "react";

export default function InputBox({ onSend }) {
    const [text, setText] = useState("");

    const handleSend = () => {
        if (!text.trim()) return;
        onSend(text);
        setText("");
    };

    return (
        <div className="flex gap-2 w-full p-2 bg-gray-900">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your query..."
                className="flex-1 p-3 rounded bg-gray-800 text-white outline-none"
            />

            <button
                onClick={handleSend}
                className="bg-green-500 px-4 rounded text-black font-bold"
            >
                Send
            </button>
        </div>
    );
}